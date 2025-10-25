import Election from "../models/Election.js";
import { getElectionContract, wallet } from "../utils/blockchain.js";
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

// GET /api/results/:electionId
export const getResults = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId required" });

		const contract = await loadElectionContract(electionId);
		const results = await contract.getResults();
		// results: [ids[], names[], voteCounts[]]
		const ids = results[0].map((bn) => bn.toString());
		const names = results[1];
		const votes = results[2].map((bn) => bn.toString());
		return res.json({ electionId, count: ids.length, ids, names, votes });
	} catch (err) {
		console.error("getResults error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/results/:electionId/winner
export const getWinner = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId required" });

		const contract = await loadElectionContract(electionId);
		const winnerIdBN = await contract.getWinner();
		const winnerId = winnerIdBN.toString();

		let winnerDetails = null;
		if (winnerId !== "0") {
			try {
				const cand = await contract.getCandidateDetails(winnerIdBN);
				winnerDetails = {
					candidateId: cand.id?.toString ? cand.id.toString() : cand.id,
					name: cand.name,
					party: cand.party,
					voteCount: cand.voteCount?.toString ? cand.voteCount.toString() : cand.voteCount
				};
			} catch (e) {
				// ignore if candidate details not fetchable
			}
		}

		return res.json({ electionId, winnerId, winner: winnerDetails });
	} catch (err) {
		console.error("getWinner error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// POST /api/results/:electionId/declare
export const declareResult = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId required" });

		// use backend signer (wallet) to call declareResult (manager action)
		const contract = await loadElectionContract(electionId, wallet);
		const tx = await contract.declareResult();
		const receipt = await tx.wait();

		// try to read winner after tx
		let winner = null;
		try {
			const winnerIdBN = await contract.getWinner();
			const winnerId = winnerIdBN.toString();
			if (winnerId !== "0") {
				const cand = await contract.getCandidateDetails(winnerIdBN);
				winner = {
					candidateId: cand.id?.toString ? cand.id.toString() : cand.id,
					name: cand.name,
					party: cand.party,
					voteCount: cand.voteCount?.toString ? cand.voteCount.toString() : cand.voteCount
				};
			}
		} catch (e) {
			// ignore
		}

		return res.json({
			message: "Result declared on-chain",
			txHash: tx.hash,
			blockNumber: receipt.blockNumber,
			winner
		});
	} catch (err) {
		console.error("declareResult error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/results/:electionId/analytics
export const getDetailedAnalytics = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId required" });

		const contract = await loadElectionContract(electionId);
		const results = await contract.getResults();
		const ids = results[0].map((bn) => bn.toString());
		const names = results[1];
		const votes = results[2].map((bn) => bn.toNumber ? bn.toNumber() : Number(results[2]));

		// Try to get totalVotes from electionInfo
		let totalVotes = 0;
		try {
			const info = await contract.getElectionInfo();
			totalVotes = info.totalVotes?.toNumber ? info.totalVotes.toNumber() : Number(info.totalVotes || 0);
		} catch (e) {
			// fallback to sum
			totalVotes = votes.reduce((s, v) => s + Number(v), 0);
		}

		const data = ids.map((id, idx) => {
			const voteCount = Number(votes[idx] || 0);
			const pct = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : "0.00";
			return {
				candidateId: id,
				name: names[idx] || "",
				votes: voteCount,
				percentage: `${pct}%`
			};
		});

		return res.json({ electionId, totalVotes, candidates: data });
	} catch (err) {
		console.error("getDetailedAnalytics error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};

// GET /api/results/:electionId/export
export const exportResults = async (req, res) => {
	try {
		const { electionId } = req.params;
		if (!electionId) return res.status(400).json({ message: "electionId required" });

		const contract = await loadElectionContract(electionId);
		const results = await contract.getResults();
		const ids = results[0].map((bn) => bn.toString());
		const names = results[1];
		const votes = results[2].map((bn) => bn.toString());

		// compute total for percentages
		const total = votes.reduce((s, v) => s + Number(v), 0);

		// build CSV
		let csv = "candidateId,name,votes,percentage\n";
		for (let i = 0; i < ids.length; i++) {
			const pct = total > 0 ? ((Number(votes[i]) / total) * 100).toFixed(2) : "0.00";
			// escape quotes in name
			const nameSafe = (names[i] || "").replace(/"/g, '""');
			csv += `${ids[i]},"${nameSafe}",${votes[i]},${pct}%\n`;
		}

		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename="results_${electionId}.csv"`);
		return res.send(csv);
	} catch (err) {
		console.error("exportResults error:", err);
		return res.status(500).json({ message: err?.reason || err?.message || "Server error" });
	}
};
