import Candidate from "../models/Candidate.js";
import Election from "../models/Election.js";
import User from "../models/User.js";
import { getElectionContract, provider, wallet } from "../utils/blockchain.js";
import { ethers } from "ethers";

// helper: accept election id (numeric) or contract address, return contract connected with signer (default backend wallet)
const loadElectionContractForId = async (electionIdOrAddress, signer = wallet) => {
	if (!electionIdOrAddress) throw new Error("election identifier required");
	let contractAddress = electionIdOrAddress;
	if (!/^0x/i.test(String(electionIdOrAddress))) {
		// treat as numeric id
		const numericId = parseInt(electionIdOrAddress, 10);
		if (Number.isNaN(numericId)) throw new Error("invalid election id");
		const db = await Election.findOne({ electionId: numericId }).lean();
		if (!db) throw new Error("Election not found in DB");
		contractAddress = db.contractAddress;
	}
	return getElectionContract(contractAddress, signer);
};

// map on-chain Candidate struct to plain object
const mapChainCandidate = (c) => ({
	candidateId: c.id?.toString ? c.id.toString() : c.id,
	candidateAddress: c.candidateAddress,
	name: c.name,
	party: c.party,
	manifesto: c.manifesto,
	imageHash: c.imageHash,
	status: (typeof c.status === "number") ? c.status : (c.status?.toString ? c.status.toString() : c.status),
	voteCount: c.voteCount?.toString ? c.voteCount.toString() : c.voteCount,
	exists: c.exists ?? true
});

// POST /api/candidates/:id/register
export const registerCandidate = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, party, manifesto, imageHash, candidatePrivateKey, walletAddress } = req.body;
		console.log("Register candidate request:", { id, name, party, manifesto, imageHash, walletAddress });
		if (!id || !name || !party) return res.status(400).json({ message: "id, name and party are required" });

		// signer: if candidatePrivateKey provided, sign as candidate; otherwise use backend wallet
		let signer = wallet;
		if (candidatePrivateKey) {
			try {
				signer = new ethers.Wallet(candidatePrivateKey, provider);
			} catch (e) {
				return res.status(400).json({ message: "Invalid candidatePrivateKey" });
			}
		}

		const contract = await loadElectionContractForId(id, signer);

		// Check on-chain election status before attempting to send a tx.
		// Accept registration when:
		//  - status === Registration (enum value 1), OR
		//  - registrationDeadline (on-chain) is in the future (block timestamp <= registrationDeadline).
		// This allows registration while the contract hasn't had its status transitioned but the deadline still permits registration.
		try {
			const info = await contract.getElectionInfo();
			// info may be struct or array; prefer named field
			const rawStatus = info?.status ?? info[5];
			const statusNum = typeof rawStatus === "object" && typeof rawStatus.toNumber === "function"
				? rawStatus.toNumber()
				: (typeof rawStatus === "string" ? Number(rawStatus) : rawStatus);

			if (statusNum == null) {
				// unknown status — try to fall back to registrationDeadline check below
			}

			let registrationAllowed = false;
			// Registration enum value expected to be 1 per contract
			if (Number(statusNum) === 1) {
				registrationAllowed = true;
			} else {
				// try registrationDeadline fallback
				const regDeadlineBN = info?.registrationDeadline ?? info?.registrationDeadline ?? info[4];
				if (regDeadlineBN) {
					const regDeadline = regDeadlineBN.toNumber ? regDeadlineBN.toNumber() : Number(regDeadlineBN);
					// read latest block timestamp for current chain time
					try {
						const latest = await provider.getBlock("latest");
						const nowTs = latest?.timestamp ?? Math.floor(Date.now() / 1000);
						if (regDeadline && nowTs <= regDeadline) {
							registrationAllowed = true;
						}
					} catch (blkErr) {
						// If we cannot get block timestamp, log and fall back to disallow (safer)
						console.warn("Failed to read latest block for registration deadline check:", blkErr?.message || blkErr);
					}
				}
			}

			if (!registrationAllowed) {
				return res.status(400).json({ message: "Election is not in registration phase; cannot register candidate now" });
			}
		} catch (e) {
			// If getElectionInfo fails, log and continue — we'll still attempt registration but provide clearer errors if it reverts.
			console.warn("getElectionInfo check failed (continuing):", e?.message || e);
		}

		let tx;
		try {
			tx = await contract.registerCandidate(name, party, manifesto || "", imageHash || "");
			const receipt = await tx.wait();
			
			// attempt to read assigned on-chain candidate id (if contract exposes counter)
			let candidateId;
			try {
				const counter = await contract.getCandidateIdCounter();
				candidateId = counter?.toString ? counter.toString() : counter;
			} catch (e) {
				candidateId = undefined;
			}

			// store DB record (best-effort). If walletAddress provided use it; else if signer is Wallet use its address.
			const candidateWallet = walletAddress ? walletAddress.toLowerCase() : (signer.address ? signer.address.toLowerCase() : undefined);
			let electionIdNum;
			// try to resolve electionId from id param or factory
			if (/^0x/i.test(String(id))) {
				// find in DB by contractAddress
				const db = await Election.findOne({ contractAddress: id.toLowerCase() }).lean();
				electionIdNum = db ? db.electionId : undefined;
			} else {
				electionIdNum = parseInt(id, 10);
			}

			const candDoc = await Candidate.create({
				candidateId: candidateId ?? undefined,
				electionId: electionIdNum,
				electionAddress: ( /^0x/i.test(String(id)) ? id.toLowerCase() : undefined ),
				walletAddress: candidateWallet,
				name,
				party,
				manifesto,
				imageHash,
				status: "Pending",
				voteCount: 0
			}).catch(() => null); // ignore DB failure

			return res.status(201).json({
				message: "Candidate registration transaction submitted",
				txHash: tx.hash,
				blockNumber: receipt.blockNumber,
				candidate: candDoc ? { id: candDoc._id, walletAddress: candDoc.walletAddress, name: candDoc.name, candidateId: candDoc.candidateId } : null,
				onChainCandidateId: candidateId
			});
		} catch (err) {
			console.error("registerCandidate error:", err);

			// Try to parse revert reason / estimate error and return a clear client-visible message
			if (err && (err.code === "UNPREDICTABLE_GAS_LIMIT" || err.code === "CALL_EXCEPTION")) {
				// Infura style nested body
				if (err?.error?.body) {
					try {
						const body = JSON.parse(err.error.body);
						const rpcErr = body?.error;
						if (rpcErr?.message) return res.status(400).json({ message: rpcErr.message });
					} catch (parseErr) { /* ignore */ }
				}
				if (err?.error?.message) return res.status(400).json({ message: err.error.message });
				return res.status(400).json({ message: err?.reason || "Contract call would revert (check election status / inputs)" });
			}

			// other errors
			return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
		}
	} catch (err) {
		console.error("registerCandidate error (outer):", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/candidates/:id[?status=Approved|Pending|Rejected]
export const getCandidatesByElection = async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.query;

		// try DB first
		let dbQuery = {};
		if (/^0x/i.test(String(id))) {
			dbQuery.electionAddress = id.toLowerCase();
		} else {
			const numericId = parseInt(id, 10);
			if (Number.isNaN(numericId)) return res.status(400).json({ message: "invalid election id" });
			dbQuery.electionId = numericId;
		}
		if (status) dbQuery.status = status;

		const dbList = await Candidate.find(dbQuery).sort({ createdAt: -1 }).lean();
		if (dbList && dbList.length > 0) return res.json({ source: "db", count: dbList.length, candidates: dbList });

		// fallback to on-chain
		const contract = await loadElectionContractForId(id);
		let list = [];
		if (!status || status === "Approved") {
			try {
				const approved = await contract.getAllApprovedCandidates();
				list = list.concat(approved.map(mapChainCandidate));
			} catch (e) {
				/* ignore */
			}
		}
		if (!status || status === "Pending") {
			try {
				const pending = await contract.getPendingCandidates();
				list = list.concat(pending.map(mapChainCandidate));
			} catch (e) {
				/* ignore */
			}
		}
		// remove duplicates by candidateId
		const uniq = [];
		const seen = new Set();
		for (const c of list) {
			const key = c.candidateId ?? c.candidateAddress;
			if (!seen.has(key)) { seen.add(key); uniq.push(c); }
		}
		return res.json({ source: "chain", count: uniq.length, candidates: uniq });
	} catch (err) {
		console.error("getCandidatesByElection error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// GET /api/candidates/:id/pending
export const getPendingCandidates = async (req, res) => {
	try {
		req.query.status = "Pending";
		return await getCandidatesByElection(req, res);
	} catch (err) {
		console.error("getPendingCandidates error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// POST /api/candidates/:id/validate  { candidateId, approve }
export const validateCandidate = async (req, res) => {
	try {
		const { id } = req.params;
		const { candidateId, approve } = req.body;
		if (!id || candidateId == null) return res.status(400).json({ message: "id and candidateId are required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.validateCandidate(candidateId, !!approve);
		const receipt = await tx.wait();

		// update DB if present
		const filter = {};
		if (!/^0x/i.test(String(id))) filter.electionId = parseInt(id, 10);
		else filter.electionAddress = id.toLowerCase();
		// try update by candidateId or fallback by walletAddress if stored locally
		let updated = null;
		const cDoc = await Candidate.findOne({ ...filter, candidateId: candidateId }).exec();
		if (cDoc) {
			cDoc.status = approve ? "Approved" : "Rejected";
			if (approve) cDoc.voteCount = cDoc.voteCount ?? 0;
			await cDoc.save();
			updated = cDoc.toObject();
		}

		return res.json({ message: "Candidate validation tx sent", txHash: tx.hash, blockNumber: receipt.blockNumber, updated });
	} catch (err) {
		console.error("validateCandidate error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/candidates/:id/candidate/:candidateId
export const getCandidateDetails = async (req, res) => {
	try {
		const { id, candidateId } = req.params;
		if (!id || candidateId == null) return res.status(400).json({ message: "id and candidateId required" });

		// DB first
		const filter = {};
		if (!/^0x/i.test(String(id))) filter.electionId = parseInt(id, 10);
		else filter.electionAddress = id.toLowerCase();
		let cDoc = await Candidate.findOne({ ...filter, candidateId: candidateId }).lean();
		if (cDoc) return res.json({ source: "db", candidate: cDoc });

		// on-chain fallback
		const contract = await loadElectionContractForId(id);
		const cand = await contract.getCandidateDetails(candidateId);
		return res.json({ source: "chain", candidate: mapChainCandidate(cand) });
	} catch (err) {
		console.error("getCandidateDetails error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/candidates/:id/approved
export const getApprovedCandidates = async (req, res) => {
	try {
		req.query.status = "Approved";
		return await getCandidatesByElection(req, res);
	} catch (err) {
		console.error("getApprovedCandidates error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};
