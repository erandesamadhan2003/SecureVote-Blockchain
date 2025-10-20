import express from 'express';
import { auth } from '../middlewares/auth.js';
import { castVote, getMyVotes } from '../controllers/vote.controller.js';
import { checkRole, ROLES } from '../middlewares/roleCheck.js';

const router = express.Router();

router.post('/', auth, checkRole([ROLES.VOTER]), castVote);
router.get('/my-votes', auth, getMyVotes);

export default router;