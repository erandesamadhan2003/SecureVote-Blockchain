import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import { Candidate } from "../models/candidate.js";

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Register Voter
export const registerVoter = async (req, res) => {
  try {
    const { walletAddress, email, phone, aadharHash, personalInfo } = req.body;

    const hashedAadhar = await bcrypt.hash(aadharHash, 10);

    const user = new User({
      walletAddress,
      email,
      phone,
      aadharHash: hashedAadhar,
      role: "voter",
      personalInfo,
    });

    await user.save();
    res.status(201).json({ message: "Voter registered successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error registering voter", error: error.message });
  }
};

// Register Candidate
export const registerCandidate = async (req, res) => {
  try {
    const { candidateId, electionId, name, party, manifesto, walletAddress, aadharHash } = req.body;

    const hashedAadhar = await bcrypt.hash(aadharHash, 10);

    const candidate = new Candidate({
      candidateId,
      electionId,
      name,
      party,
      manifesto,
      walletAddress,
      aadharHash: hashedAadhar,
    });

    await candidate.save();
    res.status(201).json({ message: "Candidate registered successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error registering candidate", error: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { aadharHash, role } = req.body;

    let user;
    if (role === "voter") {
      user = await User.findOne({ role: "voter" });
    } else if (role === "candidate") {
      user = await Candidate.findOne({});
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(aadharHash, user.aadharHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid Aadhar" });

    const token = jwt.sign({ id: user._id, role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
