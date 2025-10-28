import User from "../models/User.js";

/**
 * GET /api/admin/users 
 * Query: page, limit, q, role, verified, sortBy, sortOrder
 */   
export const getUsers = async (req, res) => {
	 try {
		 const page = Math.max(1, parseInt(req.query.page || "1", 10));
		 const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || "20", 10)));
		 const q = (req.query.q || "").trim();
		 const role = req.query.role;
		 const verified = req.query.verified;
		 const sortBy = req.query.sortBy || "createdAt";
		 const sortOrder = (req.query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;

		 const filter = {};
		 if (q) {
			 const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
			 filter.$or = [{ name: regex }, { email: regex }, { walletAddress: regex }];
		 }
		 if (role && role !== "all") filter.role = role;
		 if (verified === "true") filter.isVerified = true;
		 if (verified === "false") filter.isVerified = false;

		 const total = await User.countDocuments(filter);
		 const users = await User.find(filter)
			 .sort({ [sortBy]: sortOrder })
			 .skip((page - 1) * limit)
			 .limit(limit)
			 .lean();

		 return res.json({ users, total, page, limit });
	 } catch (err) {
		 console.error("admin.getUsers error:", err);
		 return res.status(500).json({ message: err?.message || "Failed to fetch users" });
	 }
 };

/**
 * PUT /api/admin/users/:id/role
 * Body: { role }
 */
export const updateUserRole = async (req, res) => {
	try {
		const { id } = req.params;
		const { role } = req.body;
		if (!id || !role) return res.status(400).json({ message: "id and role required" });
		const user = await User.findById(id);
		if (!user) return res.status(404).json({ message: "User not found" });
		user.role = role;
		await user.save();
		return res.json({ message: "Role updated", user: { id: user._id, role: user.role } });
	} catch (err) {
		console.error("admin.updateUserRole error:", err);
		return res.status(500).json({ message: err?.message || "Failed to update role" });
	}
};

/**
 * PUT /api/admin/users/:id/verify
 * Body: { verify: true|false }
 */
export const setUserVerified = async (req, res) => {
	try {
		const { id } = req.params;
		const verify = !!req.body.verify;
		if (!id) return res.status(400).json({ message: "id required" });
		const user = await User.findById(id);
		if (!user) return res.status(404).json({ message: "User not found" });
		user.isVerified = verify;
		await user.save();
		return res.json({ message: verify ? "User verified" : "User unverified", user: { id: user._id, isVerified: user.isVerified } });
	} catch (err) {
		console.error("admin.setUserVerified error:", err);
		return res.status(500).json({ message: err?.message || "Failed to update verification" });
	}
};

/**
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ message: "id required" });
		const user = await User.findByIdAndDelete(id);
		if (!user) return res.status(404).json({ message: "User not found" });
		return res.json({ message: "User deleted", id: user._id });
	} catch (err) {
		console.error("admin.deleteUser error:", err);
		return res.status(500).json({ message: err?.message || "Failed to delete user" });
	}
};

/**
 * POST /api/admin/users/bulk-action
 * Body: { action: "assignRole"|"verify"|"delete", role?, verify?, users: [ids] }
 */
export const bulkAction = async (req, res) => {
	try {
		const { action, role, verify, users } = req.body;
		if (!action || !Array.isArray(users) || users.length === 0) return res.status(400).json({ message: "action and users[] required" });

		const ids = users.map((id) => id).filter(Boolean);
		let result = { processed: 0, failed: 0 };

		if (action === "assignRole") {
			if (!role) return res.status(400).json({ message: "role is required for assignRole" });
			const r = await User.updateMany({ _id: { $in: ids } }, { $set: { role } });
			result.processed = r.nModified ?? r.modifiedCount ?? 0;
		} else if (action === "verify") {
			const flag = !!verify;
			const r = await User.updateMany({ _id: { $in: ids } }, { $set: { isVerified: flag } });
			result.processed = r.nModified ?? r.modifiedCount ?? 0;
		} else if (action === "delete") {
			const r = await User.deleteMany({ _id: { $in: ids } });
			result.processed = r.deletedCount ?? 0;
		} else {
			return res.status(400).json({ message: "Unsupported action" });
		}

		return res.json({ message: "Bulk action completed", result });
	} catch (err) {
		console.error("admin.bulkAction error:", err);
		return res.status(500).json({ message: err?.message || "Bulk action failed" });
	}
};
