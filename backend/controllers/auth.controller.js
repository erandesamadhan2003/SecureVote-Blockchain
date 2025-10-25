import jwt from "jsonwebtoken";
import User from "../models/User.js";

const signToken = (user) => {
    const payload = { id: user._id, role: user.role };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    });
};

export const register = async (req, res) => {
    try {
        const { walletAddress, name, aadharNumber } = req.body;
        if (!walletAddress || !name || !aadharNumber) {
            return res.status(400).json({ message: "walletAddress, name and aadharNumber are required" });
        }

        const aadharNormalized = aadharNumber.toString().trim();
        const walletLower = walletAddress.toLowerCase();

        const existing = await User.findOne({
            $or: [{ aadharNumber: aadharNormalized }, { walletAddress: walletLower }]
        });
        if (existing) {
            return res.status(409).json({ message: "User with this aadharNumber or walletAddress already exists" });
        }

        const user = await User.create({
            walletAddress: walletLower,
            name,
            aadharNumber: aadharNormalized
            // role defaults to USER
        });

        const token = signToken(user);

        const userSafe = {
            id: user._id,
            walletAddress: user.walletAddress,
            name: user.name,
            aadharNumber: user.aadharNumber,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt
        };

        return res.status(201).json({ token, user: userSafe });
    } catch (err) {
        console.error("Register error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

export const login = async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ message: "Provide walletAddress" });
        }

        const walletLower = walletAddress.toLowerCase();
        const user = await User.findOne({ walletAddress: walletLower });
        if (!user) {
            return res.status(401).json({ message: "Invalid walletAddress" });
        }

        const token = signToken(user);

        const userSafe = {
            id: user._id,
            walletAddress: user.walletAddress,
            name: user.name,
            aadharNumber: user.aadharNumber,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt
        };

        return res.json({ token, user: userSafe });
    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// in-memory token blacklist (note: non-persistent; restart clears it)
const tokenBlacklist = new Set();

const isBlacklisted = (token) => tokenBlacklist.has(token);

export const getProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
        }

        const token = authHeader.split(" ")[1];

        if (isBlacklisted(token)) {
            return res.status(401).json({ message: "Token revoked" });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const user = await User.findById(decoded.id).lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userSafe = {
            id: user._id,
            walletAddress: user.walletAddress,
            name: user.name,
            aadharNumber: user.aadharNumber,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt
        };

        return res.json({ user: userSafe });
    } catch (err) {
        console.error("getProfile error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(400).json({ message: "Authorization token missing" });
        }
        const token = authHeader.split(" ")[1];
        // add token to blacklist
        tokenBlacklist.add(token);
        return res.json({ message: "Logged out" });
    } catch (err) {
        console.error("logout error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
        