import User from "../models/User.js";
import Election from "../models/Election.js";
import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";
import { provider, roleContract, electionFactoryContract } from "../utils/blockchain.js";

/**
 * GET /api/dashboard/stats
 * Returns basic system counts used by frontend dashboard.
 */
export const getStats = async (req, res) => {
	try {
		// parallel counts and simple aggregates
		const [
			totalUsers,
			totalCandidates,
			activeElectionsCount,
			allElections
		] = await Promise.all([
			User.countDocuments(),
			Candidate.countDocuments(),
			Election.countDocuments({ $or: [{ status: "Voting" }, { isActive: true }] }),
			Election.find({}, { totalVotes: 1 }).lean()
		]);

		// sum totalVotes if stored in DB (fallback to 0)
		const totalVotes = (Array.isArray(allElections) ? allElections.reduce((s, e) => s + (Number(e.totalVotes || 0)), 0) : 0);

		// pending approvals
		const pendingApprovals = await Candidate.countDocuments({ status: "Pending" });

		// return a compact object expected by frontend
		return res.json({
			totalUsers,
			totalCandidates,
			activeElections: activeElectionsCount,
			totalVotes,
			pendingApprovals,
			// optional fields
			totalVoters: null,
			uptimeSeconds: Math.floor(process.uptime())
		});
	} catch (err) {
		console.error("dashboard.getStats error:", err);
		return res.status(500).json({ message: err?.message || "Failed to compute stats" });
	}
};

/**
 * GET /api/dashboard/activities?limit=5
 * Synthesizes recent activities from DB (elections created, candidates registered, users created).
 * Returns array of activity items: { type, message, time, meta }
 */
export const getRecentActivities = async (req, res) => {
	try {
		const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "5", 10)));

		// fetch recent items from multiple collections
		const [recentElections, recentCandidates, recentUsers] = await Promise.all([
			Election.find().sort({ createdAt: -1 }).limit(limit).lean(),
			Candidate.find().sort({ createdAt: -1 }).limit(limit).lean(),
			User.find().sort({ createdAt: -1 }).limit(limit).lean()
		]);

		const activities = [];

		(recentElections || []).forEach((e) => {
			activities.push({
				type: "ElectionCreated",
				message: `Election created: ${e.name || "Untitled"}`,
				time: e.createdAt || e.startTime || null,
				meta: { electionId: e.electionId ?? e._id, contractAddress: e.contractAddress }
			});
		});

		(recentCandidates || []).forEach((c) => {
			activities.push({
				type: "CandidateRegistered",
				message: `Candidate registered: ${c.name || c.walletAddress || "Unnamed"}`,
				time: c.createdAt || null,
				meta: { electionId: c.electionId, candidateId: c.candidateId ?? c._id, candidateAddress: c.walletAddress }
			});
		});

		(recentUsers || []).forEach((u) => {
			activities.push({
				type: "UserRegistered",
				message: `User registered: ${u.name || u.walletAddress || "Unknown"}`,
				time: u.createdAt || null,
				meta: { userId: u._id, walletAddress: u.walletAddress }
			});
		});

		// sort all activities by time desc and slice to requested limit
		const sorted = activities
			.filter((a) => a.time)
			.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
			.slice(0, limit);

		return res.json(sorted);
	} catch (err) {
		console.error("dashboard.getRecentActivities error:", err);
		return res.status(500).json({ message: err?.message || "Failed to load activities" });
	}
};

// GET /api/dashboard/health
export const getHealth = async (req, res) => {
	try {
		const start = Date.now();
		// DB status
		const dbState = mongoose.connection.readyState; // 1 = connected
		const dbStatus = dbState === 1 ? "ok" : "down";

		// blockchain status check (best-effort)
		let blockchain = { status: "unknown" };
		try {
			if (provider) {
				const blockStart = Date.now();
				const blockNumber = await provider.getBlockNumber();
				const blockEnd = Date.now();
				blockchain = {
					status: "ok",
					latestBlock: blockNumber,
					rttMs: blockEnd - blockStart
				};
			}
		} catch (e) {
			blockchain = { status: "down", error: String(e?.message || e) };
		}

		// contract presence checks
		const contracts = {};
		try {
			if (roleContract && roleContract.address) {
				const code = await provider.getCode(roleContract.address);
				contracts.roles = { address: roleContract.address, deployed: !!code && code !== "0x" };
			}
		} catch (e) {
			contracts.roles = { address: roleContract?.address ?? null, deployed: false, error: String(e?.message || e) };
		}
		try {
			if (electionFactoryContract && electionFactoryContract.address) {
				const code = await provider.getCode(electionFactoryContract.address);
				contracts.factory = { address: electionFactoryContract.address, deployed: !!code && code !== "0x" };
			}
		} catch (e) {
			contracts.factory = { address: electionFactoryContract?.address ?? null, deployed: false, error: String(e?.message || e) };
		}

		const end = Date.now();
		return res.json({
			dbStatus,
			blockchain,
			contracts,
			apiResponseMs: end - start,
			lastSync: new Date().toISOString()
		});
	} catch (err) {
		console.error("dashboard.getHealth error:", err);
		return res.status(500).json({ message: err?.message || "Failed to get health" });
	}
};

export default {
	getStats,
	getRecentActivities,
	getHealth
};
