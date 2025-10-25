import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import candidateService from "../../services/candidateService.js";

// Initial state
const initialState = {
    candidates: [],
    pendingCandidates: [],
    approvedCandidates: [],
    selectedCandidate: null,
    isLoading: false,
    error: null
};

// Thunks
export const fetchCandidates = createAsyncThunk(
    "candidates/fetchCandidates",
    async ({ electionId, status } = {}, { rejectWithValue }) => {
        try {
            const res = await candidateService.getCandidatesByElection(electionId, status);
            // service returns { source, count, candidates } or array
            return res;
        } catch (err) {
            return rejectWithValue(err?.message || "Failed to fetch candidates");
        }
    }
);

export const fetchPendingCandidates = createAsyncThunk(
    "candidates/fetchPending",
    async (electionId, { rejectWithValue }) => {
        try {
            const res = await candidateService.getPendingCandidates(electionId);
            return res;
        } catch (err) {
            return rejectWithValue(err?.message || "Failed to fetch pending candidates");
        }
    }
);

export const registerNewCandidate = createAsyncThunk(
    "candidates/registerNew",
    async (data, { rejectWithValue }) => {
        try {
            const res = await candidateService.registerCandidate(data);
            return res;
        } catch (err) {
            return rejectWithValue(err?.message || "Failed to register candidate");
        }
    }
);

export const approveCandidate = createAsyncThunk(
    "candidates/approve",
    async ({ electionId, candidateId, approved }, { rejectWithValue }) => {
        try {
            const res = await candidateService.validateCandidate(electionId, candidateId, approved);
            return { res, electionId, candidateId, approved };
        } catch (err) {
            return rejectWithValue(err?.message || "Failed to validate candidate");
        }
    }
);

const candidateSlice = createSlice({
    name: "candidates",
    initialState,
    reducers: {
        setSelectedCandidate(state, action) {
            state.selectedCandidate = action.payload;
        },
        clearSelectedCandidate(state) {
            state.selectedCandidate = null;
        },
        // filterCandidates can be used to set view-only arrays based on status
        filterCandidates(state, action) {
            const status = action.payload;
            if (!status || status === "all") {
                state.pendingCandidates = state.candidates.filter(c => c.status === "Pending");
                state.approvedCandidates = state.candidates.filter(c => c.status === "Approved");
            } else {
                // set pending/approved arrays accordingly
                state.pendingCandidates = status === "Pending" ? state.candidates.filter(c => c.status === "Pending") : state.pendingCandidates;
                state.approvedCandidates = status === "Approved" ? state.candidates.filter(c => c.status === "Approved") : state.approvedCandidates;
            }
        },
        clearError(state) {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // fetchCandidates
            .addCase(fetchCandidates.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCandidates.fulfilled, (state, action) => {
                state.isLoading = false;
                const payload = action.payload || {};
                const list = payload?.candidates ?? payload;
                state.candidates = Array.isArray(list) ? list : [];
                state.pendingCandidates = state.candidates.filter(c => (c.status || "").toLowerCase() === "pending");
                state.approvedCandidates = state.candidates.filter(c => (c.status || "").toLowerCase() === "approved");
            })
            .addCase(fetchCandidates.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || action.error.message;
            })

            // fetchPendingCandidates
            .addCase(fetchPendingCandidates.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPendingCandidates.fulfilled, (state, action) => {
                state.isLoading = false;
                const payload = action.payload || {};
                const list = payload?.candidates ?? payload;
                state.pendingCandidates = Array.isArray(list) ? list : [];
            })
            .addCase(fetchPendingCandidates.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || action.error.message;
            })

            // registerNewCandidate
            .addCase(registerNewCandidate.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerNewCandidate.fulfilled, (state, action) => {
                state.isLoading = false;
                const payload = action.payload || {};
                // payload may include candidate info or tx info; try to append candidate if available
                const candidate = payload?.candidate ?? payload;
                if (candidate) {
                    // If server returned DB candidate structure, push; otherwise leave lists to be refreshed by caller
                    if (typeof candidate === "object" && (candidate.candidateId || candidate.walletAddress || candidate.name)) {
                        state.candidates.unshift(candidate);
                        if ((candidate.status || "").toLowerCase() === "pending") state.pendingCandidates.unshift(candidate);
                        if ((candidate.status || "").toLowerCase() === "approved") state.approvedCandidates.unshift(candidate);
                    }
                }
            })
            .addCase(registerNewCandidate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || action.error.message;
            })

            // approveCandidate
            .addCase(approveCandidate.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(approveCandidate.fulfilled, (state, action) => {
                state.isLoading = false;
                const { candidateId, approved } = action.payload;
                // Update candidate status in lists
                const updateStatus = (arr) => arr.map(c => (String(c.candidateId ?? c.id) === String(candidateId) ? { ...c, status: approved ? "Approved" : "Rejected" } : c));
                state.candidates = updateStatus(state.candidates);
                state.pendingCandidates = state.pendingCandidates.filter(c => String(c.candidateId ?? c.id) !== String(candidateId));
                if (approved) {
                    const updated = state.candidates.find(c => String(c.candidateId ?? c.id) === String(candidateId));
                    if (updated) state.approvedCandidates.unshift(updated);
                } else {
                    // removed from pending; if needed track rejected separately (not in scope)
                }
            })
            .addCase(approveCandidate.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload || action.error.message;
            });
    }
});

export const { setSelectedCandidate, clearSelectedCandidate, filterCandidates, clearError } = candidateSlice.actions;

// Selectors
export const selectAllCandidates = (state) => state.candidates.candidates;
export const selectPendingCandidates = (state) => state.candidates.pendingCandidates;
export const selectApprovedCandidates = (state) => state.candidates.approvedCandidates;
export const selectSelectedCandidate = (state) => state.candidates.selectedCandidate;
export const selectCandidatesByElection = (electionId) => (state) =>
    (state.candidates.candidates || []).filter(c => String(c.electionId ?? c.electionId) === String(electionId));

export default candidateSlice.reducer;
