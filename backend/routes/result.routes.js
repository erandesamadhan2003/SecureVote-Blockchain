    import express from "express";
import {
	getResults,
	getWinner,
	declareResult,
	getDetailedAnalytics,
	exportResults
} from "../controllers/result.controller.js";

const router = express.Router();

// GET /api/results/:electionId
router.get("/:electionId", getResults);

// GET /api/results/:electionId/winner
router.get("/:electionId/winner", getWinner);

// POST /api/results/:electionId/declare
router.post("/:electionId/declare", declareResult);

// GET /api/results/:electionId/analytics
router.get("/:electionId/analytics", getDetailedAnalytics);

// GET /api/results/:electionId/export
router.get("/:electionId/export", exportResults);

export default router;
