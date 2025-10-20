import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    roles: [{
        type: String,
        enum: ['SUPER_ADMIN', 'ELECTION_MANAGER', 'ELECTION_AUTHORITY', 'VOTER']
    }],
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    nonce: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    registrationDate: {
        type: Date,
        default: Date.now
    },
    lastLogin: Date
}, {
    timestamps: true
});


export const User = mongoose.model('User', userSchema);