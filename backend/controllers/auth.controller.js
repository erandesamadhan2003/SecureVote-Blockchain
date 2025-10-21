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
