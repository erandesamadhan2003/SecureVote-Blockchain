import express from 'express';
import { auth } from '../middlewares/auth.js';
import { checkRole, ROLES } from '../middlewares/roleCheck.js';
import { Election } from '../models/Election.js'
import { Candidate } from '../models/Candidate.js';
import { User } from '../models/User.js';

const router = express.Router();

// Get admin dashboard stats
router.get('/dashboard-stats', auth, checkRole([ROLES.SUPER_ADMIN, ROLES.ELECTION_MANAGER]), async (req, res) => {
    try {
        const totalElections = await Election.countDocuments();
        const totalUsers = await User.countDocuments();
        const totalCandidates = await Candidate.countDocuments();
        const activeElections = await Election.countDocuments({ isActive: true });

        res.status(200).json({
            success: true,
            data: {
                totalElections,
                totalUsers,
                totalCandidates,
                activeElections
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
});

// Add role to user
router.post('/roles/add', auth, checkRole([ROLES.SUPER_ADMIN, ROLES.ELECTION_MANAGER]), async (req, res) => {
    try {
        const { address, role } = req.body;

        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const user = await User.findOneAndUpdate(
            { walletAddress: address.toLowerCase() },
            { role },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: `Role ${role} assigned successfully`,
            data: user
        });
    } catch (error) {
        console.error('Add role error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding role'
        });
    }
});

export default router;