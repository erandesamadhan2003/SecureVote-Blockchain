import express from "express";
import {
	addSuperAdmin,
	addElectionManager,
	addElectionAuthority,
	addVoter
} from "../controllers/roles.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/roles/super-admin { account }
router.post("/super-admin", authMiddleware, addSuperAdmin);

// POST /api/roles/election-manager { account }
router.post("/election-manager", authMiddleware, addElectionManager);

// POST /api/roles/election-authority { account }
router.post("/election-authority", authMiddleware, addElectionAuthority);

// POST /api/roles/voter { account }
router.post("/voter", authMiddleware, addVoter);

// DEBUG: return the current req.user and extracted roles for troubleshooting
router.get("/whoami", (req, res) => {
	try {
		const callerUser = req.user ?? null;
		let callerRoles = [];
		try {
			// attempt to reuse extractor if available via controller require
			const controller = require("../controllers/roles.controller.js");
			if (controller && typeof controller.extractRolesFromReq === "function") {
				callerRoles = controller.extractRolesFromReq(req);
			}
		} catch {
			// fallback: inspect common fields
			if (req.user) {
				if (typeof req.user.role === "string") callerRoles.push(req.user.role);
				if (Array.isArray(req.user.roles)) callerRoles = callerRoles.concat(req.user.roles);
			}
		}
		return res.json({ callerUser, callerRoles });
	} catch (e) {
		return res.status(500).json({ message: "whoami error", error: String(e) });
	}
});

export default router;
