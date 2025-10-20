import { Candidate } from '../models/Candidate.js';
import { Election } from '../models/Election.js';
import ContractService from '../utils/contractService.js';

// Register as candidate
export const registerCandidate = async (req, res) => {
    try {
        const { electionId, name, party, manifesto, imageHash } = req.body;
        const candidateAddress = req.user.walletAddress;

        // Check if election exists and is in registration phase
        const election = await Election.findOne({ electionId: parseInt(electionId) });

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        if (election.status !== 'Registration') {   
            return res.status(400).json({
                success: false,
                message: 'Candidate registration is only allowed during registration phase'
            });
        }

        // Check if already registered
        const existingCandidate = await Candidate.findOne({
            electionId: parseInt(electionId),
            candidateAddress: candidateAddress.toLowerCase()
        });

        if (existingCandidate) {
            return res.status(400).json({
                success: false,
                message: 'Already registered as candidate for this election'
            });
        }

        // Register on blockchain (this would be called from frontend with user's wallet)
        // For now, we'll just save to database
        const candidate = await Candidate.create({
            electionId: parseInt(electionId),
            candidateAddress: candidateAddress.toLowerCase(),
            name,
            party,
            manifesto,
            imageHash,
            status: 'Pending'
        });

        res.status(201).json({
            success: true,
            message: 'Candidate registered successfully',
            data: candidate
        });
    } catch (error) {
        console.error('Register candidate error:', error);
        res.status(500).json({
            success: false,
            message: 'Error registering candidate'
        });
    }
};

// Get candidate details
export const getCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({
            $or: [
                { _id: req.params.id },
                { candidateId: parseInt(req.params.id) }
            ]
        });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        res.status(200).json({
            success: true,
            data: candidate
        });
    } catch (error) {
        console.error('Get candidate error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching candidate'
        });
    }
};

// Validate candidate (Approve/Reject)
export const validateCandidate = async (req, res) => {
    try {
        const { approved } = req.body;
        const candidateId = req.params.id;

        const candidate = await Candidate.findOne({ candidateId: parseInt(candidateId) });

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: 'Candidate not found'
            });
        }

        // Update candidate status
        candidate.status = approved ? 'Approved' : 'Rejected';
        await candidate.save();

        res.status(200).json({
            success: true,
            message: `Candidate ${approved ? 'approved' : 'rejected'} successfully`,
            data: candidate
        });
    } catch (error) {
        console.error('Validate candidate error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating candidate'
        });
    }
};