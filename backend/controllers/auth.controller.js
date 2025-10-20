import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ethers } from 'ethers';

// Generate nonce for wallet signature
export const generateNonce = async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Valid wallet address is required'
            });
        }

        // Generate random nonce
        const nonce = Math.floor(Math.random() * 1000000).toString();

        // Save or update user with nonce
        await User.findOneAndUpdate(
            { walletAddress: walletAddress.toLowerCase() },
            {
                walletAddress: walletAddress.toLowerCase(),
                nonce,
                lastLogin: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            nonce,
            message: 'Nonce generated successfully'
        });
    } catch (error) {
        console.error('Generate nonce error:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating nonce'
        });
    }
};

// Verify wallet signature and login
export const walletLogin = async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address and signature are required'
            });
        }

        // Find user by wallet address
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });

        if (!user || !user.nonce) {
            return res.status(400).json({
                success: false,
                message: 'User not found or nonce expired'
            });
        }

        // Verify signature
        const message = `Sign this message to authenticate with SecureVote. Nonce: ${user.nonce}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                walletAddress: user.walletAddress,
                userId: user._id
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Clear nonce after successful login
        user.nonce = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            token,
            user: {
                walletAddress: user.walletAddress,
                role: user.role,
                isActive: user.isActive
            },
            message: 'Login successful'
        });
    } catch (error) {
        console.error('Wallet login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during wallet login'
        });
    }
};

// Verify token
export const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-nonce');

        res.status(200).json({
            success: true,
            user: {
                walletAddress: user.walletAddress,
                role: user.role,
                isActive: user.isActive,
                registeredAt: user.registeredAt
            }
        });
    } catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
};