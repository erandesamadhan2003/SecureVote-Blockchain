import mongoose from "mongoose";

const electionSchema = new mongoose.Schema({
  electionId: { type: Number, required: true, unique: true },
  contractAddress: { type: String, required: true, lowercase: true },
  name: { type: String, required: true },
  description: String,
  creator: { type: String, required: true, lowercase: true }, // wallet address
  startTime: Date,
  endTime: Date,
  registrationDeadline: Date,
  status: String,
  isActive: { type: Boolean, default: true },
  // blockchain metadata
  transactionHash: { type: String },
  blockNumber: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Election", electionSchema);
