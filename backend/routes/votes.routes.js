import express from "express";
import {
	registerVoter,
	registerVotersBatch,
	castVote,
	hasVoted,
	getVoterInfo,
	getTotalVoters
} from "../controllers/votes.controller.js";

const router = express.Router();

// POST /api/votes/register-voter
router.post("/register-voter", registerVoter);

// POST /api/votes/register-voters-batch
router.post("/register-voters-batch", registerVotersBatch);

// POST /api/votes/cast
router.post("/cast", castVote);

// GET /api/votes/has-voted/:electionId
router.get("/has-voted/:electionId", hasVoted);

// GET /api/votes/voter-info/:electionId
router.get("/voter-info/:electionId", getVoterInfo);

// GET /api/votes/total/:electionId
router.get("/total/:electionId", getTotalVoters);

export default router;
