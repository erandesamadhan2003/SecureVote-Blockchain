import express from "express";
import {
  registerCandidate,
  getCandidatesByElection,
  getPendingCandidates,
  validateCandidate,
  getCandidateDetails,
  getApprovedCandidates
} from "../controllers/candidate.controller.js";

const router = express.Router();

// POST /api/candidates/:id/register
router.post("/:id/register", registerCandidate);

// GET /api/candidates/:id         -> list (optional ?status=Approved|Pending|Rejected)
router.get("/:id", getCandidatesByElection);

// GET /api/candidates/:id/pending
router.get("/:id/pending", getPendingCandidates);

// POST /api/candidates/:id/validate  { candidateId, approve }
router.post("/:id/validate", validateCandidate);

// GET /api/candidates/:id/candidate/:candidateId
router.get("/:id/candidate/:candidateId", getCandidateDetails);

// GET /api/candidates/:id/approved
router.get("/:id/approved", getApprovedCandidates);

export default router;
