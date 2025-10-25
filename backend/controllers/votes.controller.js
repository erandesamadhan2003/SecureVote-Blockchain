import { getElectionContract, provider, wallet } from "../utils/blockchain.js";
import Election from "../models/Election.js";
import User from "../models/User.js";
import { ethers } from "ethers";

// helper to resolve contract address from id or address and return contract connected to signer (default backend wallet)
const loadElectionContract = async (electionIdOrAddress, signer = wallet) => {
	if (!electionIdOrAddress) throw new Error("election identifier required");
	let contractAddress = electionIdOrAddress;
	if (!/^0x/i.test(String(electionIdOrAddress))) {
		const numericId = parseInt(electionIdOrAddress, 10);
		if (Number.isNaN(numericId)) throw new Error("invalid election id");
		const db = await Election.findOne({ electionId: numericId }).lean();
		if (!db) throw new Error("Election not found");
		contractAddress = db.contractAddress;
	}
	return getElectionContract(contractAddress, signer);
};

// POST /api/votes/register-voter
export const registerVoter = async (req, res) => {
	try {
		const { electionId, voterAddress } = req.body;
		if (!electionId || !voterAddress) return res.status(400).json({ message: "electionId and voterAddress are required" });

		const contract = await loadElectionContract(electionId);
		const tx = await contract.registerVoter(voterAddress);
		const receipt = await tx.wait();

		// update DB user if exists
		const user = await User.findOne({ walletAddress: voterAddress.toLowerCase() });
		if (user) {
			user.isVerified = true;
			await user.save();
		}

		return res.json({ message: "Voter registered on-chain", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("registerVoter error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// POST /api/votes/register-voters-batch
export const registerVotersBatch = async (req, res) => {
	try {
		const { electionId, voters } = req.body;
		if (!electionId || !Array.isArray(voters) || voters.length === 0) {
			return res.status(400).json({ message: "electionId and voters[] are required" });
		}
		const contract = await loadElectionContract(electionId);
		const tx = await contract.registerVoterBatch(voters);
		const receipt = await tx.wait();

		// best-effort DB update
		await Promise.all(voters.map(async (addr) => {
			try {
				const u = await User.findOne({ walletAddress: addr.toLowerCase() });
				if (u) {
					u.isVerified = true;
					await u.save();
				}
			} catch { /* ignore */ }
		}));

		return res.json({ message: "Voter batch registered", txHash: tx.hash, blockNumber: receipt.blockNumber, count: voters.length });
	} catch (err) {
		console.error("registerVotersBatch error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// POST /api/votes/cast
export const castVote = async (req, res) => {
	try {
		const { electionId, candidateId, voterPrivateKey } = req.body;
		if (!electionId || candidateId == null) return res.status(400).json({ message: "electionId and candidateId are required" });

		// prefer voterPrivateKey (server-side signing). Client-side signing is recommended instead.
		if (!voterPrivateKey) {
			return res.status(400).json({ message: "voterPrivateKey required for server-side casting. Prefer client-side signing." });
		}

		// build signer and contract
		let signer;
		try {
			signer = new ethers.Wallet(voterPrivateKey, provider);
		} catch (e) {
			return res.status(400).json({ message: "Invalid voterPrivateKey" });
		}
		const contract = await loadElectionContract(electionId, signer);
		const tx = await contract.castVote(candidateId);
		const receipt = await tx.wait();

		return res.json({ message: "Vote cast", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("castVote error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/votes/has-voted/:electionId
export const hasVoted = async (req, res) => {
	try {
		const { electionId } = req.params;
		// wallet can be passed as query.address or taken from authenticated req.user
		const address = (req.query.address || req.user?.walletAddress);
		if (!electionId || !address) return res.status(400).json({ message: "electionId and address are required" });

		const contract = await loadElectionContract(electionId);
		const voted = await contract.hasVoted(address);
		return res.json({ electionId, address, hasVoted: !!voted });
	} catch (err) {
		console.error("hasVoted error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/votes/voter-info/:electionId
export const getVoterInfo = async (req, res) => {
	try {
		const { electionId } = req.params;
		const address = (req.query.address || req.user?.walletAddress);
		if (!electionId || !address) return res.status(400).json({ message: "electionId and address are required" });

		const contract = await loadElectionContract(electionId);
		const info = await contract.getVoterInfo(address);
		// normalize BigNumber fields if any and return
		const normalized = {
			isRegistered: !!info.isRegistered,
			hasVoted: !!info.hasVoted,
			votedCandidateId: info.votedCandidateId?.toString ? info.votedCandidateId.toString() : info.votedCandidateId,
			registrationTime: info.registrationTime?.toNumber ? info.registrationTime.toNumber() : info.registrationTime
		};
		return res.json({ electionId, address, voterInfo: normalized });
	} catch (err) {
		console.error("getVoterInfo error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/votes/total/:electionId
export const getTotalVoters = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId is required" });

		const contract = await loadElectionContract(electionId);
		const total = await contract.getTotalVoters();
		return res.json({ electionId, total: total?.toString ? total.toString() : total });
	} catch (err) {
		console.error("getTotalVoters error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};
