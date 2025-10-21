import express from "express";
import {
  getAllElections,
  getElectionById,
  createElection,
  startCandidateRegistration,
  startVoting,
  endElection,
  declareResult,
  registerCandidate,
  validateCandidate,
  registerVoter,
  registerVoterBatch,
  castVote,
  getResultsOnChain,
  getCandidateDetailsOnChain,
  getAllApprovedCandidatesOnChain,
  getPendingCandidatesOnChain
} from "../controllers/election.controller.js";

const router = express.Router();

router.get("/", getAllElections);
router.get("/:id", getElectionById);

// lifecycle actions
router.post("/:id/start-registration", startCandidateRegistration);
router.post("/:id/start-voting", startVoting);
router.post("/:id/end", endElection);
router.post("/:id/declare-result", declareResult);

// candidate actions
router.post("/:id/register-candidate", registerCandidate);
router.post("/:id/validate-candidate", validateCandidate);

// voter registration actions
router.post("/:id/register-voter", registerVoter);
router.post("/:id/register-voters", registerVoterBatch);

// voting
router.post("/:id/cast-vote", castVote);

// queries
router.get("/:id/results", getResultsOnChain);
router.get("/:id/candidate/:candidateId", getCandidateDetailsOnChain);
router.get("/:id/approved-candidates", getAllApprovedCandidatesOnChain);
router.get("/:id/pending-candidates", getPendingCandidatesOnChain);

// create election
router.post("/", createElection);

export default router;
