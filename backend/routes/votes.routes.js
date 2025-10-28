import express from "express";
import {
	registerVoter,
	registerVotersBatch,
	castVote,
	hasVoted,
	getVoterInfo,
	getTotalVoters
} from "../controllers/votes.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// POST /api/votes/register-voter
router.post("/register-voter", authMiddleware, registerVoter);

// POST /api/votes/register-voters-batch
router.post("/register-voters-batch", authMiddleware, registerVotersBatch);

// POST /api/votes/cast
router.post("/cast", authMiddleware, castVote);

// GET /api/votes/has-voted/:electionId
router.get("/has-voted/:electionId", authMiddleware, hasVoted);

// GET /api/votes/voter-info/:electionId
router.get("/voter-info/:electionId", authMiddleware, getVoterInfo);

// GET /api/votes/total/:electionId
router.get("/total/:electionId", authMiddleware, getTotalVoters);

export default router;
