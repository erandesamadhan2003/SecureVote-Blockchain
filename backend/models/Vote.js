import mongoose from 'mongoose';
import { emitVoteCasted } from '../utils/websocket';

const voteSchema = new mongoose.Schema({
    voterAddress: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid Ethereum address format'
        }
    },
    electionId: {
        type: Number,
        required: true,
        index: true
    },
    candidateId: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{64}$/.test(v);
            },
            message: 'Invalid transaction hash format'
        }
    },
    blockNumber: {
        type: Number,
        required: true,
        min: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate votes
voteSchema.index({ electionId: 1, voterAddress: 1 }, { unique: true });
voteSchema.index({ electionId: 1, candidateId: 1 });
voteSchema.index({ transactionHash: 1 });
voteSchema.index({ blockNumber: -1 });

// Static method to find votes by election
voteSchema.statics.findByElection = function (electionId) {
    return this.find({ electionId });
};

// Static method to find votes by voter
voteSchema.statics.findByVoter = function (voterAddress) {
    return this.find({
        voterAddress: voterAddress.toLowerCase()
    });
};

// Static method to check if voter has voted in election
voteSchema.statics.hasVoted = async function (electionId, voterAddress) {
    const vote = await this.findOne({
        electionId,
        voterAddress: voterAddress.toLowerCase()
    });
    return !!vote;
};

// Static method to get vote count per candidate in election
voteSchema.statics.getVoteCounts = function (electionId) {
    return this.aggregate([
        { $match: { electionId } },
        {
            $group: {
                _id: '$candidateId',
                voteCount: { $sum: 1 }
            }
        },
        { $sort: { voteCount: -1 } }
    ]);
};

// Method to get vote details
voteSchema.methods.getDetails = function () {
    return {
        voterAddress: this.voterAddress,
        electionId: this.electionId,
        candidateId: this.candidateId,
        transactionHash: this.transactionHash,
        blockNumber: this.blockNumber,
        timestamp: this.timestamp
    };
};

// Post-save hook to emit socket event when a vote is created
voteSchema.post('save', function (doc) {
  try {
    const payload = {
      electionId: doc.electionId,
      candidateId: doc.candidateId,
      voterAddress: doc.voterAddress,
      transactionHash: doc.transactionHash,
      timestamp: doc.timestamp || new Date()
    };
    emitVoteCasted(doc.electionId, payload);
  } catch (e) {
    console.warn('emitVoteCasted failed', e);
  }
});

export const Vote = mongoose.models.Vote || mongoose.model('Vote', voteSchema);