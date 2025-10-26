import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
        }
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        const user = await User.findById(decoded.id).lean();
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        // attach minimal user to req.user (walletAddress and role used by controllers)
        req.user = {
            id: user._id,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: !!user.isVerified
        };

        return next();
    } catch (err) {
        console.error("authMiddleware error:", err);
        return res.status(500).json({ message: "Server error" });
    }
}
