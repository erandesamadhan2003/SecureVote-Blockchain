import mongoose from 'mongoose';

const electionSchema = new mongoose.Schema({
    electionId: {
        type: Number,
        required: true,
        unique: true
    },
    contractAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    registrationDeadline: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Created', 'Registration', 'Voting', 'Ended', 'ResultDeclared'],
        default: 'Created'
    },
    totalVotes: {
        type: Number,
        default: 0
    },
    totalCandidates: {
        type: Number,
        default: 0
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    creatorAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    candidates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Candidate'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    resultsCalculated: {
        type: Boolean,
        default: false
    },
    winnerId: Number,
    lastSyncedAt: Date
}, {
    timestamps: true
});


export const Election = mongoose.model('Election', electionSchema);
