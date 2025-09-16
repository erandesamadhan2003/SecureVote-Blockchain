import mongoose from 'mongoose';

const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  electionId: { type: Number, required: true },
  name: { type: String, required: true },
  party: { type: String },
  manifesto: { type: String },
  walletAddress: { type: String, required: true },
  voteCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Candidate = mongoose.model('Candidate', candidateSchema);
