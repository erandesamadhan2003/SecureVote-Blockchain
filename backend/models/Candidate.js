import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    candidateId: {
        type: Number,
        required: true
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
    electionAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    candidateAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    party: {
        type: String,
        required: true,
        trim: true
    },
    manifesto: {
        type: String,
        trim: true
    },
    imageHash: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    voteCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});


export const Candidate = mongoose.model('Candidate', candidateSchema);