import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
    voter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    voterAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    election: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Election',
        required: true
    },
    electionId: {
        type: Number,
        required: true
    },
    candidate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate',
        required: true
    },
    candidateId: {
        type: Number,
        required: true
    },
    transactionHash: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    blockNumber: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});


export const Vote = mongoose.model('Vote', voteSchema);