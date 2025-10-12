import express from "express";
import { registerVoter, registerCandidate, login } from "../controller/auth.controller.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const authrouter = express.Router();


authrouter.post("/register/voter", registerVoter);
authrouter.post("/register/candidate", registerCandidate);
authrouter.post("/login", login);

authrouter.get("/voting-page", authMiddleware(["voter"]), (req, res) => {
  res.json({ message: `Welcome Voter ${req.user.id}` });
});

authrouter.get("/candidate-dashboard", authMiddleware(["candidate"]), (req, res) => {
  res.json({ message: `Welcome Candidate ${req.user.id}` });
});

export default authrouter;
