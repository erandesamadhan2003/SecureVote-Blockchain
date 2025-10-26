import express from "express";
import { getStats, getRecentActivities, getHealth } from "../controllers/dashboard.controller.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", getStats);

// GET /api/dashboard/activities?limit=5
router.get("/activities", getRecentActivities);

// GET /api/dashboard/health
router.get("/health", getHealth);

export default router;
