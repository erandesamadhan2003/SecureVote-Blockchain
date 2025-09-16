import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  aadharHash: { type: String, required: true, unique: true },
  kycStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  role: { type: String, enum: ['admin', 'voter', 'candidate'], required: true },

  personalInfo: {
    firstname: { type: String },
    lastname: { type: String },
    DOB: { type: Date },
    address: {
      street: String,
      city: String,
      state: String,
      zip: String
    },
    votingHistory: [{
      electionId: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
  }
});

export const User = mongoose.model('User', userSchema);
