import express from 'express';
import { generateNonce, walletLogin, verifyToken } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/nonce', generateNonce);
router.post('/wallet-login', walletLogin);
router.get('/verify', auth, verifyToken);

export default router;