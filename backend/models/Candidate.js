import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
    candidateId: {
        type: Number,
        required: true
    },
    electionId: {
        type: Number,
        required: true,
        index: true
    },
    candidateAddress: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid Ethereum address format'
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    party: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Party name cannot be more than 50 characters']
    },
    manifesto: {
        type: String,
        required: true,
        trim: true,
        maxlength: [2000, 'Manifesto cannot be more than 2000 characters']
    },
    imageHash: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        validate: {
            validator: function (v) {
                return !v || /^https?:\/\/.+\..+/.test(v);
            },
            message: 'Invalid URL format'
        }
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    voteCount: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Compound index for unique candidate per election
candidateSchema.index({ electionId: 1, candidateAddress: 1 }, { unique: true });
candidateSchema.index({ electionId: 1, status: 1 });
candidateSchema.index({ electionId: 1, voteCount: -1 });

// Static method to find approved candidates for an election
candidateSchema.statics.findApprovedByElection = function (electionId) {
    return this.find({
        electionId,
        status: 'Approved'
    }).sort({ voteCount: -1 });
};

// Static method to find pending candidates
candidateSchema.statics.findPendingByElection = function (electionId) {
    return this.find({
        electionId,
        status: 'Pending'
    });
};

// Static method to get candidate by ID and election
candidateSchema.statics.findByElectionAndId = function (electionId, candidateId) {
    return this.findOne({
        electionId,
        candidateId
    });
};

// Method to check if candidate is approved
candidateSchema.methods.isApproved = function () {
    return this.status === 'Approved';
};

// Virtual for candidate profile (excludes internal fields)
candidateSchema.virtual('profile').get(function () {
    return {
        candidateId: this.candidateId,
        name: this.name,
        party: this.party,
        manifesto: this.manifesto,
        imageUrl: this.imageUrl,
        voteCount: this.voteCount,
        status: this.status
    };
});

export const Candidate = mongoose.model('Candidate', candidateSchema);