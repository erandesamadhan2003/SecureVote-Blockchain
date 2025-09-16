import mongoose from 'mongoose';

const electionManagerSchema = new mongoose.Schema({
  electionId: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  electionType: {
    type: String,
    enum: ['Presidential', 'Parliamentary', 'Local', 'Corporate', 'Referendum'],
    required: true
  },
  electionAuthority: { type: String, required: true },
  managerContract: { type: String, required: true },

  candidates: [{
    candidateId: { type: String, required: true },
    name: { type: String, required: true },
    party: { type: String },
    manifesto: { type: String },
    voteCount: { type: Number, default: 0 }
  }],

  voters: [{
    walletAddress: { type: String, required: true },
    hasVoted: { type: Boolean, default: false }
  }],

  // votes: [{
  //   voter: { type: String, required: true },
  //   candidateId: { type: String, required: true },
  //   timestamp: { type: Date, default: Date.now }
  // }],

  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed'],
    default: 'upcoming'
  },

  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const ElectionManager = mongoose.model('ElectionManager', electionManagerSchema);
