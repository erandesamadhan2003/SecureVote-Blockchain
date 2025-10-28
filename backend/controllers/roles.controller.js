import { roleContract } from "../utils/blockchain.js";
import User from "../models/User.js";

const sendTxAndUpdateUser = async (contractMethod, account, newRole) => {
	// contractMethod is a function on roleContract; account is address string
	const tx = await contractMethod(account);
	const receipt = await tx.wait();
	let updatedUser = null;
	const walletLower = account.toLowerCase();
	const user = await User.findOne({ walletAddress: walletLower });
	if (user && newRole) {
		user.role = newRole;
		await user.save();
		updatedUser = {
			id: user._id,
			walletAddress: user.walletAddress,
			role: user.role
		};
	}
	return { txHash: tx.hash, blockNumber: receipt.blockNumber, user: updatedUser };
};

// helper to get caller role string
const getCallerRole = (req) => (req.user?.role || "").toString().toUpperCase();

export const addSuperAdmin = async (req, res) => {
	try {
		const callerRole = getCallerRole(req);
		if (callerRole !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden: requires SUPER_ADMIN" });

		const { account } = req.body;
		if (!account) return res.status(400).json({ message: "account is required" });

		// corrected binding: use roleContract (was rovleContract)
		const result = await sendTxAndUpdateUser(roleContract.addSuperAdmin.bind(roleContract), account, "SUPER_ADMIN");
		return res.json({ message: "Super admin added", ...result });
	} catch (err) {
		console.error("addSuperAdmin error:", err);
		const msg = err?.reason || err?.data?.message || err?.message || "Server error";
		return res.status(500).json({ message: msg });
	}
};

export const addElectionManager = async (req, res) => {
	try {
		const callerRole = getCallerRole(req);
		if (callerRole !== "SUPER_ADMIN") return res.status(403).json({ message: "Forbidden: requires SUPER_ADMIN" });

		const { account } = req.body;
		if (!account) return res.status(400).json({ message: "account is required" });

		const result = await sendTxAndUpdateUser(roleContract.addElectionManager.bind(roleContract), account, "ELECTION_MANAGER");
		console.log("addElectionManager result:", result);
		return res.json({ message: "Election manager added", ...result });
	} catch (err) {
		console.error("addElectionManager error:", err);
		const msg = err?.reason || err?.data?.message || err?.message || "Server error";
		return res.status(500).json({ message: msg });
	}
};

export const addElectionAuthority = async (req, res) => {
	try {
		const callerRole = getCallerRole(req);
		if (!["SUPER_ADMIN", "ELECTION_MANAGER"].includes(callerRole)) {
			return res.status(403).json({ message: "Forbidden: requires SUPER_ADMIN or ELECTION_MANAGER" });
		}

		const { account } = req.body;
		if (!account) return res.status(400).json({ message: "account is required" });

		const result = await sendTxAndUpdateUser(roleContract.addElectionAuthority.bind(roleContract), account, "ELECTION_AUTHORITY");
		console.log("addElectionAuthority result:", result);
		return res.json({ message: "Election authority added", ...result });
	} catch (err) {
		console.error("addElectionAuthority error:", err);
		const msg = err?.reason || err?.data?.message || err?.message || "Server error";
		return res.status(500).json({ message: msg });
	}
};

export const addVoter = async (req, res) => {
	try {
		const callerRole = getCallerRole(req);
		if (!["SUPER_ADMIN", "ELECTION_MANAGER", "ELECTION_AUTHORITY"].includes(callerRole)) {
			return res.status(403).json({ message: "Forbidden: requires ELECTION_MANAGER or ELECTION_AUTHORITY or SUPER_ADMIN" });
		}

		const { account } = req.body;
		if (!account) return res.status(400).json({ message: "account is required" });

		const result = await sendTxAndUpdateUser(roleContract.addVoter.bind(roleContract), account, "VOTER");
		console.log("addVoter result:", result);
		return res.json({ message: "Voter added", ...result });
	} catch (err) {
		console.error("addVoter error:", err);
		const msg = err?.reason || err?.data?.message || err?.message || "Server error";
		return res.status(500).json({ message: msg });
	}
};
