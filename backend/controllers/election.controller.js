import { Candidate } from '../models/Candidate.js';
import { Election } from '../models/Election.js';
import ContractService from '../utils/contractService.js';

// Get all elections
export const getElections = async (req, res) => {
    try {
        const { status, isActive } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const elections = await Election.find(filter)
            .sort({ createdAt: -1 })
            .select('-__v');

        res.status(200).json({
            success: true,
            count: elections.length,
            data: elections
        });
    } catch (error) {
        console.error('Get elections error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching elections'
        });
    }
};

// Get single election
export const getElection = async (req, res) => {
    try {
        const election = await Election.findOne({
            $or: [
                { _id: req.params.id },
                { electionId: parseInt(req.params.id) },
                { contractAddress: req.params.id }
            ]
        });

        if (!election) {                
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        // Get candidates for this election
        const candidates = await Candidate.find({
            electionId: election.electionId
        }).select('-__v');

        res.status(200).json({
            success: true,
            data: {
                ...election.toObject(),
                candidates
            }
        });
    } catch (error) {
        console.error('Get election error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching election'
        });
    }
};

// Get election candidates
export const getElectionCandidates = async (req, res) => {
    try {
        const { status } = req.query;
        let filter = { electionId: parseInt(req.params.id) };

        if (status) filter.status = status;

        const candidates = await Candidate.find(filter).select('-__v');

        res.status(200).json({
            success: true,
            count: candidates.length,
            data: candidates
        });
    } catch (error) {
        console.error('Get election candidates error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching candidates'
        });
    }
};

// Get election results
export const getElectionResults = async (req, res) => {
    try {
        const election = await Election.findOne({
            $or: [
                { _id: req.params.id },
                { electionId: parseInt(req.params.id) }
            ]
        });

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found'
            });
        }

        if (election.status !== 'Ended' && election.status !== 'ResultDeclared') {
            return res.status(400).json({
                success: false,
                message: 'Election results are not available yet'
            });
        }

        const candidates = await Candidate.find({
            electionId: election.electionId,
            status: 'Approved'
        }).sort({ voteCount: -1 }).select('-__v');

        // Calculate percentages
        const totalVotes = election.totalVotes;
        const results = candidates.map(candidate => ({
            ...candidate.toObject(),
            votePercentage: totalVotes > 0 ? (candidate.voteCount / totalVotes * 100).toFixed(2) : 0
        }));

        // Find winner
        const winner = results.length > 0 ? results[0] : null;

        res.status(200).json({
            success: true,
            data: {
                election: {
                    id: election.electionId,
                    name: election.name,
                    totalVotes: election.totalVotes,
                    status: election.status
                },
                results,
                winner
            }
        });
    } catch (error) {
        console.error('Get election results error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching election results'
        });
    }
};

// Sync election from blockchain
export const syncElection = async (req, res) => {
    try {
        const election = await Election.findOne({
            $or: [
                { _id: req.params.id },
                { electionId: parseInt(req.params.id) },
                { contractAddress: req.params.id }
            ]
        });

        if (!election) {
            return res.status(404).json({
                success: false,
                message: 'Election not found in database'
            });
        }

        const updatedElection = await ContractService.syncElectionToDB(election.contractAddress);

        res.status(200).json({
            success: true,
            message: 'Election synced successfully',
            data: updatedElection
        });
    } catch (error) {
        console.error('Sync election error:', error);
        res.status(500).json({
            success: false,
            message: 'Error syncing election from blockchain'
        });
    }
};