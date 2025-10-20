import mongoose from 'mongoose';
import { emitStatusChanged } from '../utils/websocket';

const electionSchema = new mongoose.Schema({
    electionId: {
        type: Number,
        required: true,
        index: true
    },
    contractAddress: {
        type: String,
        required: true,
        unique: true,
        index: true,
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
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: [1000, 'Description cannot be more than 1000 characters']
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true,
        validate: {
            validator: function (v) {
                return v > this.startTime;
            },
            message: 'End time must be after start time'
        }
    },
    registrationDeadline: {
        type: Date,
        required: true,
        validate: {
            validator: function (v) {
                return v < this.startTime;
            },
            message: 'Registration deadline must be before start time'
        }
    },
    status: {
        type: String,
        enum: ['Created', 'Registration', 'Voting', 'Ended', 'ResultDeclared'],
        default: 'Created'
    },
    totalVotes: {
        type: Number,
        default: 0,
        min: 0
    },
    totalCandidates: {
        type: Number,
        default: 0,
        min: 0
    },
    creatorAddress: {
        type: String,
        required: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid Ethereum address format'
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for better query performance
electionSchema.index({ status: 1, isActive: 1 });
electionSchema.index({ startTime: 1, endTime: 1 });

// Virtual for checking if election is ongoing
electionSchema.virtual('isOngoing').get(function () {
    const now = new Date();
    return this.startTime <= now && this.endTime >= now && this.status === 'Voting';
});

// Virtual for checking if registration is open
electionSchema.virtual('isRegistrationOpen').get(function () {
    const now = new Date();
    return now <= this.registrationDeadline && this.status === 'Registration';
});

// Static method to find active elections
electionSchema.statics.findActiveElections = function () {
    return this.find({ isActive: true, status: { $in: ['Registration', 'Voting'] } });
};

// Static method to find elections by creator
electionSchema.statics.findByCreator = function (creatorAddress) {
    return this.find({
        creatorAddress: creatorAddress.toLowerCase(),
        isActive: true
    });
};

// Method to check if election can be modified
electionSchema.methods.canModify = function () {
    return this.status === 'Created' || this.status === 'Registration';
};

// Pre-save middleware to validate timestamps
electionSchema.pre('save', function (next) {
    const now = new Date();

    if (this.registrationDeadline >= this.startTime) {
        return next(new Error('Registration deadline must be before start time'));
    }

    if (this.startTime >= this.endTime) {
        return next(new Error('Start time must be before end time'));
    }

    next();
});

// Emit status-changed when status field is modified & saved
electionSchema.pre('save', function (next) {
    this._original = this.isNew ? null : this.toObject({ depopulate: true });
    next();
});

electionSchema.post('save', function (doc) {
    try {
        const prev = this._original;
        const prevStatus = prev ? prev.status : null;
        if (prevStatus && prevStatus !== doc.status) {
            emitStatusChanged(doc.electionId ?? doc._id, { electionId: doc.electionId ?? doc._id, status: doc.status });
        }
    } catch (e) {
        console.warn('emitStatusChanged failed', e);
    }
});

export const Election = mongoose.models.Election || mongoose.model('Election', electionSchema);