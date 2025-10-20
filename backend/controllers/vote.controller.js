import { Candidate } from "../models/Candidate.js";
import { Election } from "../models/Election.js";
import { Vote } from "../models/Vote.js";

// Cast vote
export const castVote = async (req, res) => {
  try {
    const { electionId, candidateId } = req.body;
    const voterAddress = req.user.walletAddress;

    // Check if election exists and is in voting phase
    const election = await Election.findOne({ electionId: parseInt(electionId) });
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    if (election.status !== 'Voting') {
      return res.status(400).json({
        success: false,
        message: 'Voting is only allowed during voting phase'
      });
    }

    // Check if candidate exists and is approved
    const candidate = await Candidate.findOne({
      electionId: parseInt(electionId),
      candidateId: parseInt(candidateId),
      status: 'Approved'
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'Candidate not found or not approved'
      });
    }

    // Check if already voted
    const existingVote = await Vote.findOne({
      electionId: parseInt(electionId),
      voterAddress: voterAddress.toLowerCase()
    });

    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'Already voted in this election'
      });
    }

    // Save vote record (actual voting happens on blockchain via frontend)
    const vote = await Vote.create({
      electionId: parseInt(electionId),
      candidateId: parseInt(candidateId),
      voterAddress: voterAddress.toLowerCase(),
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Vote recorded successfully',
      data: vote
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Error casting vote'
    });
  }
};

// Get user's voting history
export const getMyVotes = async (req, res) => {
  try {
    const voterAddress = req.user.walletAddress;

    const votes = await Vote.find({ voterAddress: voterAddress.toLowerCase() })
      .populate('electionId', 'name status')
      .populate('candidateId', 'name party')
      .sort({ timestamp: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: votes.length,
      data: votes
    });
  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching voting history'
    });
  }
};