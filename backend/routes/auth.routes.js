import express from "express";
import { register, login, getProfile, logout } from "../controllers/auth.controller.js";

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/profile
router.get("/profile", getProfile);

// POST /api/auth/logout
router.post("/logout", logout);

export default router;
