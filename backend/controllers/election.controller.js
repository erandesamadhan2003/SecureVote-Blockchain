import Election from "../models/Election.js";
import User from "../models/User.js";
import { electionFactoryContract, getElectionContract, provider, wallet } from "../utils/blockchain.js";
import { ethers } from "ethers";

export const createElection = async (req, res) => {
    try {
        const { name, description, startTime, endTime, registrationDeadline } = req.body;

        if (!name || !startTime || !endTime || !registrationDeadline) {
            return res.status(400).json({ 
                message: "name, startTime, endTime, and registrationDeadline are required" 
            });
        }

        const startTimeBigInt = Math.floor(new Date(startTime).getTime() / 1000);
        const endTimeBigInt = Math.floor(new Date(endTime).getTime() / 1000);
        const registrationDeadlineBigInt = Math.floor(new Date(registrationDeadline).getTime() / 1000);

        const currentTime = Math.floor(Date.now() / 1000);

        // New validation: registration deadline must be in the future (so Registration window is openable)
        if (registrationDeadlineBigInt <= currentTime) {
            return res.status(400).json({ message: "Registration deadline must be in the future" });
        }

        if (startTimeBigInt <= currentTime) {
            return res.status(400).json({ message: "Start time must be in the future" });
        }
        if (endTimeBigInt <= startTimeBigInt) {
            return res.status(400).json({ message: "End time must be after start time" });
        }
        if (registrationDeadlineBigInt >= startTimeBigInt) {
            return res.status(400).json({ message: "Registration deadline must be before start time" });
        }

        console.log("Creating election on blockchain...");
        const tx = await electionFactoryContract.createElection(
            name,
            description || "", 
            startTimeBigInt,
            endTimeBigInt,
            registrationDeadlineBigInt
        );

        console.log("Transaction sent:", tx.hash);
        
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);

        // ...existing event parsing & DB persistence...
        let electionId;
        let contractAddress;

        if (receipt.events && receipt.events.length > 0) {
            for (const event of receipt.events) {
                if (event.event === "ElectionCreated" || event.event === "ElectionCreated(uint256,address,address,string,uint256,uint256)") {
                    electionId = event.args?.electionId?.toString?.() ?? (event.args && event.args[0] ? String(event.args[0]) : undefined);
                    contractAddress = event.args?.electionAddress ?? (event.args && event.args[1] ? event.args[1] : undefined);
                    break;
                }
            }
        }

        if (!electionId) {
            console.log("Events not found in receipt, fetching latest election ID...");
            electionId = (await electionFactoryContract.getElectionIdCounter()).toString();
            const electionData = await electionFactoryContract.getElection(electionId);
            contractAddress = electionData.electionAddress;
        }

        console.log(`Election created - ID: ${electionId}, Address: ${contractAddress}`);

        const creatorWalletNormalized = (req?.user?.walletAddress || (wallet && wallet.address) || "").toLowerCase() || undefined;

        const election = await Election.create({
            electionId: parseInt(electionId),
            contractAddress: contractAddress.toLowerCase(),
            name,
            description: description || "",
            creator: creatorWalletNormalized || "backend",
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            registrationDeadline: new Date(registrationDeadline),
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber
        });

        return res.status(201).json({ 
            message: "Election created successfully",
            election: {
                ...election.toObject(),
                electionId: parseInt(electionId),
                contractAddress
            },
            transaction: {
                hash: tx.hash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (err) {
        console.error("Create Election error:", err);

        // Provide clearer client errors for common revert/estimate failures
        if (err && err.code === "UNPREDICTABLE_GAS_LIMIT" && err.error && err.error.body) {
            // try to extract revert reason if present
            try {
                const body = JSON.parse(err.error.body);
                const rpcErr = body?.error;
                if (rpcErr?.message) return res.status(400).json({ message: rpcErr.message });
            } catch (parseErr) { /* ignore */ }
            return res.status(400).json({ message: "Transaction would revert (cannot estimate gas). Check provided times/params." });
        }

        if (err.code === 'INSUFFICIENT_FUNDS') {
            return res.status(400).json({ message: "Insufficient funds for transaction" });
        }
        if (err.code === 'CALL_EXCEPTION') {
            return res.status(400).json({ message: "Contract call failed - check your permissions" });
        }
        if (err.reason) {
            return res.status(400).json({ message: err.reason });
        }

        return res.status(500).json({ message: "Server error" });
    }
};

// new: GET /api/elections
export const getAllElections = async (req, res) => {
	try {
		// try DB first
		const elections = await Election.find().sort({ createdAt: -1 }).lean();
		if (elections && elections.length > 0) {
			return res.json({ source: "db", count: elections.length, elections });
		}

		// fallback to on-chain
		const onChain = await electionFactoryContract.getAllElections();
		const mapped = onChain.map((e) => ({
			electionId: e.id.toString(),
			contractAddress: e.electionAddress,
			creator: e.creator,
			name: e.name,
			description: e.description,
			startTime: new Date(e.startTime.toNumber() * 1000),
			endTime: new Date(e.endTime.toNumber() * 1000),
			createdAt: new Date(e.createdAt.toNumber() * 1000),
			isActive: e.isActive
		}));

		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getAllElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// new: GET /api/elections/:id
export const getElectionById = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id is required" });
		const numericId = parseInt(id, 10);
		if (Number.isNaN(numericId)) return res.status(400).json({ message: "invalid election id" });

		// try DB first
		const election = await Election.findOne({ electionId: numericId }).lean();
		if (election) {
			// ensure status is present if stored in DB
			return res.json({ source: "db", election });
		}

		// fallback to on-chain
		const onChain = await electionFactoryContract.getElection(numericId);
		const mapped = {
			electionId: onChain.id.toString(),
			contractAddress: onChain.electionAddress,
			creator: onChain.creator,
			name: onChain.name,
			description: onChain.description,
			startTime: new Date(onChain.startTime.toNumber() * 1000),
			endTime: new Date(onChain.endTime.toNumber() * 1000),
			createdAt: new Date(onChain.createdAt.toNumber() * 1000),
			isActive: onChain.isActive,
			// map status if available
			status: onChain.status !== undefined ? mapChainStatus(onChain.status) : (onChain._status !== undefined ? mapChainStatus(onChain._status) : undefined),
			registrationDeadline: onChain.registrationDeadline ? (onChain.registrationDeadline.toNumber ? new Date(onChain.registrationDeadline.toNumber() * 1000) : new Date(Number(onChain.registrationDeadline) * 1000)) : undefined
		};

		return res.json({ source: "chain", election: mapped });
	} catch (err) {
		console.error("getElectionById error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// helper: load contract for DB election or accept provided contractAddress
const loadElectionContractForId = async (electionIdOrAddress) => {
	// electionIdOrAddress can be numeric id or an address string
	let contractAddress = electionIdOrAddress;
	if (!/^0x/i.test(String(electionIdOrAddress))) {
		// treat as id
		const numericId = parseInt(electionIdOrAddress, 10);
		const db = await Election.findOne({ electionId: numericId }).lean();
		if (!db) throw new Error("Election not found in DB");
		contractAddress = db.contractAddress;
	}
	return getElectionContract(contractAddress, wallet);
};

// POST /api/elections/:id/start-registration
export const startCandidateRegistration = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		// Determine current status and registrationDeadline (DB first)
		let registrationDeadlineTs = null;
		let currentStatus = null;

		if (!/^0x/i.test(String(id))) {
			const numericId = parseInt(id, 10);
			const db = await Election.findOne({ electionId: numericId }).lean();
			if (db) {
				if (db.registrationDeadline) registrationDeadlineTs = new Date(db.registrationDeadline).getTime() / 1000;
				if (db.status) currentStatus = String(db.status);
			}
		}

		// fallback to on-chain election info for missing fields
		if (registrationDeadlineTs == null || currentStatus == null) {
			try {
				const onChain = await electionFactoryContract.getElection(parseInt(id, 10));
				if (registrationDeadlineTs == null && onChain.registrationDeadline) {
					registrationDeadlineTs = onChain.registrationDeadline?.toNumber ? onChain.registrationDeadline.toNumber() : null;
				}
				if (currentStatus == null && onChain.status !== undefined) {
					currentStatus = mapChainStatus(onChain.status);
				}
			} catch (e) {
				// ignore; we'll validate later and let contract return a clear error if necessary
			}
		}

		// If we know status, enforce it must be "Created" before starting registration
		if (currentStatus && currentStatus !== "Created") {
			return res.status(400).json({ message: `Cannot start registration: invalid election status (${currentStatus})` });
		}

		const now = Math.floor(Date.now() / 1000);
		if (registrationDeadlineTs != null && registrationDeadlineTs <= now) {
			return res.status(400).json({ message: "Cannot start registration: registration deadline has already passed" });
		}

		const contract = await loadElectionContractForId(id);
		const tx = await contract.startCandidateRegistration();
		const receipt = await tx.wait();
		return res.json({ message: "Registration started", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("startCandidateRegistration error:", err);

		// return user-friendly message if revert reason present
		if (err && err.code === "UNPREDICTABLE_GAS_LIMIT" && err.error && err.error.body) {
			try {
				const body = JSON.parse(err.error.body);
				const rpcErr = body?.error;
				if (rpcErr?.message) return res.status(400).json({ message: rpcErr.message });
			} catch (parseErr) { /* ignore */ }
		}
		// fallback: if rpc returned a direct error.message
		if (err?.error?.message) return res.status(400).json({ message: err.error.message });
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// POST /api/elections/:id/start-voting
export const startVoting = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.startVoting();
		const receipt = await tx.wait();
		return res.json({ message: "Voting started", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("startVoting error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/end
export const endElection = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.endElection();
		const receipt = await tx.wait();
		return res.json({ message: "Election ended", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("endElection error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/declare-result
export const declareResult = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.declareResult();
		const receipt = await tx.wait();
		// try to read winner after tx (view)
		let winner;
		try {
			winner = await contract.getWinner();
		} catch (e) {
			winner = null;
		}
		return res.json({ message: "Result declared", txHash: tx.hash, blockNumber: receipt.blockNumber, winner });
	} catch (err) {
		console.error("declareResult error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/register-candidate
export const registerCandidate = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, party, manifesto, imageHash } = req.body;
		if (!id || !name || !party) return res.status(400).json({ message: "id, name and party are required" });

		const contract = await loadElectionContractForId(id);
		// registration is expected to be done by candidate (msg.sender). Backend will use ADMIN wallet to submit on behalf if needed.
		const tx = await contract.registerCandidate(name, party, manifesto || "", imageHash || "");
		const receipt = await tx.wait();
		return res.status(201).json({ message: "Candidate registered (on-chain)", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("registerCandidate error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/validate-candidate
export const validateCandidate = async (req, res) => {
	try {
		const { id } = req.params;
		const { candidateId, approve } = req.body;
		if (!id || candidateId == null) return res.status(400).json({ message: "id and candidateId are required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.validateCandidate(candidateId, !!approve);
		const receipt = await tx.wait();
		return res.json({ message: "Candidate validation tx sent", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("validateCandidate error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/register-voter
export const registerVoter = async (req, res) => {
	try {
		const { id } = req.params;
		const { account } = req.body;
		if (!id || !account) return res.status(400).json({ message: "id and account are required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.registerVoter(account);
		const receipt = await tx.wait();
		// update DB user role if exists
		const user = await User.findOne({ walletAddress: account.toLowerCase() });
		if (user) {
			user.isVerified = true;
			await user.save();
		}
		return res.json({ message: "Voter registered on-chain", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("registerVoter error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/register-voters
export const registerVoterBatch = async (req, res) => {
	try {
		const { id } = req.params;
		const { accounts } = req.body;
		if (!id || !Array.isArray(accounts) || accounts.length === 0) return res.status(400).json({ message: "id and accounts[] are required" });

		const contract = await loadElectionContractForId(id);
		const tx = await contract.registerVoterBatch(accounts);
		const receipt = await tx.wait();

		// update DB users where present (best-effort)
		await Promise.all(accounts.map(async (a) => {
			const user = await User.findOne({ walletAddress: a.toLowerCase() });
			if (user) {
				user.isVerified = true;
				await user.save();
			}
		}));

		return res.json({ message: "Voter batch registered on-chain", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("registerVoterBatch error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// POST /api/elections/:id/cast-vote
export const castVote = async (req, res) => {
	try {
		const { id } = req.params;
		const { candidateId, voterPrivateKey } = req.body;
		if (!id || candidateId == null) return res.status(400).json({ message: "id and candidateId are required" });

		// if voterPrivateKey provided, sign as that voter (backend will create a temporary signer)
		if (!voterPrivateKey) {
			return res.status(400).json({ message: "voterPrivateKey required for server-side cast. Prefer client-side signing." });
		}

		// get contract and connect with voter signer
		let contractAddress;
		if (/^0x/i.test(String(id))) {
			contractAddress = id;
		} else {
			const db = await Election.findOne({ electionId: parseInt(id, 10) }).lean();
			if (!db) return res.status(404).json({ message: "Election not found" });
			contractAddress = db.contractAddress;
		}

		const voterSigner = new ethers.Wallet(voterPrivateKey, provider);
		const contract = getElectionContract(contractAddress, voterSigner);

		const tx = await contract.castVote(candidateId);
		const receipt = await tx.wait();
		return res.json({ message: "Vote cast", txHash: tx.hash, blockNumber: receipt.blockNumber });
	} catch (err) {
		console.error("castVote error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// GET /api/elections/:id/results
export const getResultsOnChain = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		const contract = await loadElectionContractForId(id);
		const results = await contract.getResults();
		// results: (ids[], names[], voteCounts[])
		return res.json({
			ids: results[0].map((bn) => bn.toString()),
			names: results[1],
			votes: results[2].map((bn) => bn.toString())
		});
	} catch (err) {
		console.error("getResultsOnChain error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// GET /api/elections/:id/candidate/:candidateId
export const getCandidateDetailsOnChain = async (req, res) => {
	try {
		const { id, candidateId } = req.params;
		if (!id || candidateId == null) return res.status(400).json({ message: "id and candidateId required" });

		const contract = await loadElectionContractForId(id);
		const candidate = await contract.getCandidateDetails(candidateId);
		return res.json({ candidate });
	} catch (err) {
		console.error("getCandidateDetailsOnChain error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// GET /api/elections/:id/approved-candidates
export const getAllApprovedCandidatesOnChain = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "id required" });

		const contract = await loadElectionContractForId(id);
		const list = await contract.getAllApprovedCandidates();
		return res.json({ candidates: list });
	} catch (err) {
		console.error("getAllApprovedCandidatesOnChain error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// GET /api/elections/:id/pending-candidates
export const getPendingCandidatesOnChain = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "id required" });

		const contract = await loadElectionContractForId(id);
		const list = await contract.getPendingCandidates();
		return res.json({ candidates: list });
	} catch (err) {
		console.error("getPendingCandidatesOnChain error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// new: GET /api/elections/my
export const getMyElections = async (req, res) => {
	try {
		if (!req.user || !req.user.walletAddress) {
			return res.status(401).json({ message: "Unauthorized" });
		}
		const managerAddr = req.user.walletAddress.toLowerCase();

		// Try DB first
		const dbElections = await Election.find({ creator: managerAddr }).sort({ createdAt: -1 }).lean();
		if (dbElections && dbElections.length > 0) {
			return res.json({ source: "db", count: dbElections.length, elections: dbElections });
		}

		// Fallback to on-chain manager list
		const idsBN = await electionFactoryContract.getManagerElections(managerAddr);
		const ids = idsBN.map((bn) => bn.toNumber());
		if (!ids || ids.length === 0) {
			return res.json({ source: "chain", count: 0, elections: [] });
		}

		const onChain = await electionFactoryContract.getElectionsByIds(ids);
		const mapped = onChain.map((e) => ({
			electionId: e.id.toString(),
			contractAddress: e.electionAddress,
			creator: e.creator,
			name: e.name,
			description: e.description,
			startTime: new Date(e.startTime.toNumber() * 1000),
			endTime: new Date(e.endTime.toNumber() * 1000),
			createdAt: new Date(e.createdAt.toNumber() * 1000),
			isActive: e.isActive
		}));

		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getMyElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// new: POST /api/elections/:id/deactivate
export const deactivateElection = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "election id required" });

		const numericId = parseInt(id, 10);
		if (Number.isNaN(numericId)) return res.status(400).json({ message: "invalid election id" });

		// send tx to factory to deactivate
		const tx = await electionFactoryContract.deactivateElection(numericId);
		const receipt = await tx.wait();

		// update DB record if exists
		const updated = await Election.findOneAndUpdate(
			{ electionId: numericId },
			{ isActive: false, status: "Cancelled" },
			{ new: true }
		).lean();

		return res.json({
			message: "Election deactivated",
			transaction: { hash: tx.hash, blockNumber: receipt.blockNumber },
			election: updated || null
		});
	} catch (err) {
		console.error("deactivateElection error:", err);
		return res.status(500).json({ message: err?.reason || err.message || "Server error" });
	}
};

// helper: map numeric on-chain ElectionStatus to string
const mapChainStatus = (val) => {
	// val may be BigNumber, number or string
	const n = (val && val.toNumber) ? Number(val.toNumber()) : Number(val);
	switch (n) {
		case 0: return "Created";
		case 1: return "Registration";
		case 2: return "Voting";
		case 3: return "Ended";
		case 4: return "ResultDeclared";
		default: return "Unknown";
	}
};

// helper to map chain election struct to plain object
const mapChainElection = (e) => ({
	electionId: e.id.toString(),
	contractAddress: e.electionAddress,
	creator: e.creator,
	name: e.name,
	description: e.description,
	startTime: new Date(e.startTime.toNumber() * 1000),
	endTime: new Date(e.endTime.toNumber() * 1000),
	createdAt: new Date(e.createdAt.toNumber() * 1000),
	isActive: e.isActive,
	// map status if available
	status: e.status !== undefined ? mapChainStatus(e.status) : (e._status !== undefined ? mapChainStatus(e._status) : undefined),
	registrationDeadline: e.registrationDeadline ? (e.registrationDeadline.toNumber ? new Date(e.registrationDeadline.toNumber() * 1000) : new Date(Number(e.registrationDeadline) * 1000)) : undefined
});

// new: GET /api/elections/active
export const getActiveElections = async (req, res) => {
	try {
		// DB fallback
		const dbElections = await Election.find({ isActive: true }).sort({ createdAt: -1 }).lean();
		if (dbElections && dbElections.length > 0) {
			return res.json({ source: "db", count: dbElections.length, elections: dbElections });
		}

		const onChain = await electionFactoryContract.getActiveElections();
		const mapped = onChain.map(mapChainElection);
		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getActiveElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// new: GET /api/elections/upcoming
export const getUpcomingElections = async (req, res) => {
	try {
		const dbElections = await Election.find({ startTime: { $gt: new Date() }, isActive: true }).sort({ startTime: 1 }).lean();
		if (dbElections && dbElections.length > 0) {
			return res.json({ source: "db", count: dbElections.length, elections: dbElections });
		}

		const onChain = await electionFactoryContract.getUpcomingElections();
		const mapped = onChain.map(mapChainElection);
		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getUpcomingElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// new: GET /api/elections/ongoing
export const getOngoingElections = async (req, res) => {
	try {
		const now = new Date();
		const dbElections = await Election.find({ startTime: { $lte: now }, endTime: { $gte: now }, isActive: true }).sort({ startTime: -1 }).lean();
		if (dbElections && dbElections.length > 0) {
			return res.json({ source: "db", count: dbElections.length, elections: dbElections });
		}

		const onChain = await electionFactoryContract.getOngoingElections();
		const mapped = onChain.map(mapChainElection);
		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getOngoingElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};

// new: GET /api/elections/completed
export const getCompletedElections = async (req, res) => {
	try {
		const dbElections = await Election.find({ endTime: { $lt: new Date() } }).sort({ endTime: -1 }).lean();
		if (dbElections && dbElections.length > 0) {
			return res.json({ source: "db", count: dbElections.length, elections: dbElections });
		}

		const onChain = await electionFactoryContract.getCompletedElections();
		const mapped = onChain.map(mapChainElection);
		return res.json({ source: "chain", count: mapped.length, elections: mapped });
	} catch (err) {
		console.error("getCompletedElections error:", err);
		return res.status(500).json({ message: "Server error" });
	}
};