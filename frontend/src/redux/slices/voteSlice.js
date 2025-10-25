import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import voteService from "../../services/voteService.js";

const initialState = {
  hasVoted: false,
  votedCandidateId: null,
  transactionHash: null,
  isVoting: false,
  votingHistory: [],
  error: null
};

// submitVote - calls voteService.castVote and stores tx hash
export const submitVote = createAsyncThunk(
  "votes/submitVote",
  async ({ electionId, candidateId, voterPrivateKey } = {}, { rejectWithValue }) => {
    try {
      const res = await voteService.castVote(electionId, candidateId, voterPrivateKey);
      // expect res to include txHash
      return { tx: res, electionId, candidateId };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to submit vote");
    }
  }
);

// checkHasVoted - calls voteService.checkVotingStatus
export const checkHasVoted = createAsyncThunk(
  "votes/checkHasVoted",
  async ({ electionId, address } = {}, { rejectWithValue }) => {
    try {
      const res = await voteService.checkVotingStatus(electionId, address);
      // res expected { electionId, address, hasVoted }
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to check voting status");
    }
  }
);

// registerSingleVoter
export const registerSingleVoter = createAsyncThunk(
  "votes/registerSingleVoter",
  async ({ electionId, voterAddress }, { rejectWithValue }) => {
    try {
      const res = await voteService.registerVoter(electionId, voterAddress);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to register voter");
    }
  }
);

// registerMultipleVoters
export const registerMultipleVoters = createAsyncThunk(
  "votes/registerMultipleVoters",
  async ({ electionId, addresses }, { rejectWithValue }) => {
    try {
      const res = await voteService.registerVotersBatch(electionId, addresses);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to register voters batch");
    }
  }
);

const voteSlice = createSlice({
  name: "votes",
  initialState,
  reducers: {
    resetVoteState(state) {
      state.hasVoted = false;
      state.votedCandidateId = null;
      state.transactionHash = null;
      state.isVoting = false;
      state.votingHistory = [];
      state.error = null;
    },
    setVotingInProgress(state, action) {
      state.isVoting = !!action.payload;
    },
    clearVoteError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // submitVote
      .addCase(submitVote.pending, (state) => {
        state.isVoting = true;
        state.error = null;
      })
      .addCase(submitVote.fulfilled, (state, action) => {
        state.isVoting = false;
        const { tx, candidateId } = action.payload || {};
        state.transactionHash = tx?.txHash || tx?.hash || (tx?.transaction?.hash) || null;
        state.hasVoted = true;
        state.votedCandidateId = candidateId ?? state.votedCandidateId;
        if (state.transactionHash) {
          state.votingHistory.unshift({
            electionId: action.payload.electionId,
            candidateId: candidateId,
            txHash: state.transactionHash,
            timestamp: Date.now()
          });
        }
      })
      .addCase(submitVote.rejected, (state, action) => {
        state.isVoting = false;
        state.error = action.payload || action.error?.message;
      })

      // checkHasVoted
      .addCase(checkHasVoted.pending, (state) => {
        state.error = null;
      })
      .addCase(checkHasVoted.fulfilled, (state, action) => {
        const payload = action.payload || {};
        state.hasVoted = !!payload.hasVoted;
        // if API returns votedCandidateId include it
        if (payload.votedCandidateId != null) state.votedCandidateId = payload.votedCandidateId;
      })
      .addCase(checkHasVoted.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
      })

      // registerSingleVoter
      .addCase(registerSingleVoter.pending, (state) => {
        state.error = null;
      })
      .addCase(registerSingleVoter.fulfilled, (state) => {
        // no direct state change; caller may refresh voter lists
      })
      .addCase(registerSingleVoter.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
      })

      // registerMultipleVoters
      .addCase(registerMultipleVoters.pending, (state) => {
        state.error = null;
      })
      .addCase(registerMultipleVoters.fulfilled, (state) => {
        // no direct state change; caller may refresh voter lists
      })
      .addCase(registerMultipleVoters.rejected, (state, action) => {
        state.error = action.payload || action.error?.message;
      });
  }
});

export const { resetVoteState, setVotingInProgress, clearVoteError } = voteSlice.actions;

export const selectHasVoted = (state) => state.votes.hasVoted;
export const selectIsVoting = (state) => state.votes.isVoting;
export const selectVoteTransaction = (state) => state.votes.transactionHash;
export const selectVotedCandidateId = (state) => state.votes.votedCandidateId;
export const selectVotingHistory = (state) => state.votes.votingHistory;
export const selectVoteError = (state) => state.votes.error;

export default voteSlice.reducer;
