import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  electionId: { type: Number, required: true },
  voter: { type: String, required: true },       
  candidateId: { type: String, required: true },  
  timestamp: { type: Date, default: Date.now }
});

export const Vote = mongoose.model('Vote', voteSchema);
