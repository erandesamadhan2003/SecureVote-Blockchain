import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    name: { type: String, required: true },
    aadharNumber: { type: String, required: true, unique: true },
    role: {
        type: String,
        enum: ['SUPER_ADMIN', 'ELECTION_MANAGER', 'ELECTION_AUTHORITY', 'VOTER', 'USER'],
        required: true,
        default: 'USER'
    },
    voterId: String,
    isVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
