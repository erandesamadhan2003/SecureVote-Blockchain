import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
        validate: {
            validator: function (v) {
                return /^0x[a-fA-F0-9]{40}$/.test(v);
            },
            message: 'Invalid Ethereum address format'
        }
    },
    role: {
        type: String,
        enum: ['VOTER', 'ELECTION_AUTHORITY', 'ELECTION_MANAGER', 'SUPER_ADMIN'],
        default: 'VOTER'
    },
    email: {
        type: String,
        sparse: true,
        validate: {
            validator: function (v) {
                return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Invalid email format'
        }
    },
    nonce: {
        type: String,
        select: false // Don't include in queries by default
    },
    isActive: {
        type: Boolean,
        default: true
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Static method to find user by wallet address
userSchema.statics.findByWalletAddress = async function (walletAddress) {
    return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

// Static method to update user role
userSchema.statics.updateRole = async function (walletAddress, role) {
    return this.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { role },
        { new: true }
    );
};

// Method to check if user has specific role
userSchema.methods.hasRole = function (role) {
    return this.role === role;
};

// Method to get public profile (exclude sensitive fields)
userSchema.methods.toPublicJSON = function () {
    const userObject = this.toObject();
    delete userObject.nonce;
    delete userObject.__v;
    return userObject;
};

// user named export
export const User = mongoose.model('User', userSchema);