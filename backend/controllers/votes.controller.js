import { getElectionContract, provider, wallet, roleContract } from "../utils/blockchain.js";
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

// helper to extract revert reason from ethers errors (small util)
const extractEthersRevert = (err) => {
	try {
		if (!err) return null;
		if (err?.error?.body) {
			const body = JSON.parse(err.error.body);
			const rpcErr = body?.error;
			if (rpcErr?.message) return rpcErr.message;
		}
		if (err?.error?.message) return err.error.message;
		if (err?.reason) return err.reason;
		if (err?.message) {
			const m = String(err.message).match(/execution reverted: (.*)/i);
			if (m && m[1]) return m[1].trim();
			return err.message;
		}
	} catch (e) { /* ignore */ }
	return null;
};

// POST /api/votes/register-voter
export const registerVoter = async (req, res) => {
	try {
		const { electionId, voterAddress } = req.body;
		if (!electionId || !voterAddress) return res.status(400).json({ message: "electionId and voterAddress are required" });

		// Require authenticated user with manager/authority role (or super admin)
		const callerRole = (req.user?.role || "").toString().toUpperCase();
		if (!callerRole || !["ELECTION_MANAGER", "ELECTION_AUTHORITY", "SUPER_ADMIN"].includes(callerRole)) {
			return res.status(403).json({ message: "Forbidden: requires ELECTION_MANAGER or ELECTION_AUTHORITY role" });
		}

		// Attempt to grant VOTER role on Roles contract first (best-effort).
		try {
			if (roleContract) {
				let already = false;
				if (typeof roleContract.isVoter === "function") {
					try { already = await roleContract.isVoter(voterAddress); } catch { already = false; }
				} else if (typeof roleContract.hasRole === "function" && roleContract.VOTER) {
					try {
						const roleConst = roleContract.VOTER ? await roleContract.VOTER() : null;
						if (roleConst) {
							already = await roleContract.hasRole(roleConst, voterAddress);
						}
					} catch { /* ignore */ }
				}

				if (!already) {
					// prefer direct addVoter if exposed
					if (typeof roleContract.addVoter === "function") {
						const tx = await roleContract.addVoter(voterAddress);
						await tx.wait();
					} else if (typeof roleContract.grantRole === "function" && roleContract.VOTER) {
						// fallback: use grantRole with the VOTER bytes32 constant (if exposed)
						try {
							const roleConst = roleContract.VOTER ? await roleContract.VOTER() : null;
							if (roleConst) {
								const tx = await roleContract.grantRole(roleConst, voterAddress);
								await tx.wait();
							}
						} catch (e) {
							// ignore here, we'll check later whether the role exists
							console.warn("grantRole fallback failed:", e?.message || e);
						}
					}
				}
			}
		} catch (e) {
			// Log but continue to verification step below
			console.warn("Failed to add VOTER role (attempted):", e?.message || e);
		}

		// Verify role is present before calling contract.registerVoter (avoid expected revert)
		try {
			let hasVoterRole = false;
			if (roleContract && typeof roleContract.isVoter === "function") {
				hasVoterRole = await roleContract.isVoter(voterAddress);
			} else if (roleContract && typeof roleContract.hasRole === "function" && roleContract.VOTER) {
				try {
					const roleConst = roleContract.VOTER ? await roleContract.VOTER() : null;
					if (roleConst) {
						hasVoterRole = await roleContract.hasRole(roleConst, voterAddress);
					}
				} catch { /* ignore fallback */ }
			}
			if (!hasVoterRole) {
				return res.status(400).json({
					message:
						"Address does not have VOTER role and granting it failed. Grant the VOTER role (e.g. via Roles contract) before calling register-voter."
				});
			}
		} catch (e) {
			// If we cannot read the role, warn and attempt registration anyway (caller had proper authority earlier)
			console.warn("Failed to verify VOTER role after grant attempt:", e?.message || e);
		}

		const contract = await loadElectionContract(electionId);
		try {
			const tx = await contract.registerVoter(voterAddress);
			const receipt = await tx.wait();

			// update DB user if exists
			const user = await User.findOne({ walletAddress: voterAddress.toLowerCase() });
			if (user) {
				user.isVerified = true;
				await user.save();
			}
			console.log(`Voter ${voterAddress} registered for election ${electionId}`);
			return res.json({ message: "Voter registered on-chain", txHash: tx.hash, blockNumber: receipt.blockNumber });
		} catch (err) {
			console.error("registerVoter error:", err);
			const parsed = extractEthersRevert(err);
			if (parsed) return res.status(400).json({ message: parsed });
			return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
		}
	} catch (err) {
		console.error("registerVoter outer error:", err);
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

		// prefer client-side signing (MetaMask). Server-side casting requires voterPrivateKey for security.
		if (!voterPrivateKey) {
			return res.status(400).json({
				message:
					"Server-side casting requires a voter's private key. Prefer client-side signing via your wallet (e.g. MetaMask). " +
					"If you must use server-side casting provide voterPrivateKey (not recommended)."
			});
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
