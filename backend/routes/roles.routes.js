import express from "express";
import {
	addSuperAdmin,
	addElectionManager,
	addElectionAuthority,
	addVoter
} from "../controllers/roles.controller.js";

const router = express.Router();

// POST /api/roles/super-admin { account }
router.post("/super-admin", addSuperAdmin);

// POST /api/roles/election-manager { account }
router.post("/election-manager", addElectionManager);

// POST /api/roles/election-authority { account }
router.post("/election-authority", addElectionAuthority);

// POST /api/roles/voter { account }
router.post("/voter", addVoter);

export default router;
