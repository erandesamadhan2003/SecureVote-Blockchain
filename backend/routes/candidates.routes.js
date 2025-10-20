import express from 'express';
import {
  registerCandidate,
  getCandidate,
  validateCandidate
} from '../controllers/candidate.controller.js';
import { auth } from '../middlewares/auth.js';
import { checkRole, ROLES } from '../middlewares/roleCheck.js';

const router = express.Router();

router.post('/', auth, registerCandidate);
router.get('/:id', getCandidate);
router.put('/:id/validate', auth, checkRole([ROLES.ELECTION_AUTHORITY, ROLES.ELECTION_MANAGER]), validateCandidate);

export default router;