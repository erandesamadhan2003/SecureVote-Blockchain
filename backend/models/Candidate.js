import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  candidateId: { type: Number },
  electionId: { type: Number },
  electionAddress: { type: String },
  walletAddress: { type: String, lowercase: true },
  name: { type: String },
  party: { type: String },
  manifesto: { type: String },
  imageHash: { type: String }, // IPFS hash
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  voteCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Candidate', candidateSchema);
