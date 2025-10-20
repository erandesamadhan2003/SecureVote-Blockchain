import express from 'express';
import {
  getElections,
  getElection,
  getElectionCandidates,
  getElectionResults,
  syncElection
} from '../controllers/election.controller.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', getElections);
router.get('/:id', getElection);
router.get('/:id/candidates', getElectionCandidates);
router.get('/:id/results', getElectionResults);
router.get('/:id/sync', auth, syncElection);

export default router;