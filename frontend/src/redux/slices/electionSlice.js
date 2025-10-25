import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import electionService from "../../services/electionService.js";

// Initial state
const initialState = {
  allElections: [],
  myElections: [],
  activeElections: [],
  upcomingElections: [],
  completedElections: [],
  currentElection: null,
  isLoading: false,
  error: null,
  filters: { status: "all", search: "" },
  pagination: { page: 1, limit: 10, total: 0 }
};

// Async thunks

export const fetchAllElections = createAsyncThunk(
  "elections/fetchAll",
  async (filters = {}, { rejectWithValue }) => {
    try {
      const res = await electionService.getAllElections(filters);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch elections");
    }
  }
);

export const fetchElectionById = createAsyncThunk(
  "elections/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await electionService.getElectionById(id);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch election");
    }
  }
);

export const fetchMyElections = createAsyncThunk(
  "elections/fetchMy",
  async (_, { rejectWithValue }) => {
    try {
      const res = await electionService.getMyElections();
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch my elections");
    }
  }
);

export const fetchActiveElections = createAsyncThunk(
  "elections/fetchActive",
  async (_, { rejectWithValue }) => {
    try {
      const res = await electionService.getActiveElections();
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to fetch active elections");
    }
  }
);

export const createNewElection = createAsyncThunk(
  "elections/create",
  async (data, { rejectWithValue }) => {
    try {
      const res = await electionService.createElection(data);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to create election");
    }
  }
);

export const updateStatus = createAsyncThunk(
  "elections/updateStatus",
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await electionService.updateElectionStatus(id, status);
      return { id, status, res };
    } catch (err) {
      return rejectWithValue(err?.message || "Failed to update election status");
    }
  }
);

// Slice
const electionSlice = createSlice({
  name: "elections",
  initialState,
  reducers: {
    setCurrentElection(state, action) {
      state.currentElection = action.payload;
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentElection(state) {
      state.currentElection = null;
    },
    updatePagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchAllElections
      .addCase(fetchAllElections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllElections.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload || {};
        // payload may be { source, count, elections } or array
        if (Array.isArray(payload)) {
          state.allElections = payload;
          state.pagination.total = payload.length;
        } else if (payload?.elections) {
          state.allElections = payload.elections;
          state.pagination.total = payload.count ?? state.pagination.total;
        } else {
          state.allElections = payload;
        }
      })
      .addCase(fetchAllElections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // fetchElectionById
      .addCase(fetchElectionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchElectionById.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        state.currentElection = payload?.election ?? payload;
      })
      .addCase(fetchElectionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // fetchMyElections
      .addCase(fetchMyElections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyElections.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload || {};
        state.myElections = payload?.elections ?? payload;
      })
      .addCase(fetchMyElections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // fetchActiveElections
      .addCase(fetchActiveElections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchActiveElections.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload || {};
        state.activeElections = payload?.elections ?? payload;
      })
      .addCase(fetchActiveElections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // createNewElection
      .addCase(createNewElection.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createNewElection.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload || {};
        const election = payload?.election ?? payload;
        if (election) {
          // prepend new election
          state.allElections = [election, ...state.allElections];
          state.pagination.total = (state.pagination.total || 0) + 1;
        }
      })
      .addCase(createNewElection.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      })

      // updateStatus
      .addCase(updateStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        const { id, status } = action.payload;
        // update in lists
        const upsert = (arr) =>
          arr.map((e) => (String(e.electionId ?? e.id) === String(id) ? { ...e, status } : e));
        state.allElections = upsert(state.allElections);
        state.myElections = upsert(state.myElections);
        state.activeElections = upsert(state.activeElections);
        state.upcomingElections = upsert(state.upcomingElections);
        state.completedElections = upsert(state.completedElections);
        if (state.currentElection && String(state.currentElection.electionId ?? state.currentElection.id) === String(id)) {
          state.currentElection = { ...state.currentElection, status };
        }
      })
      .addCase(updateStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || action.error.message;
      });
  }
});

// Sync actions & selectors
export const { setCurrentElection, setFilters, clearCurrentElection, updatePagination, clearError } = electionSlice.actions;

export const selectAllElections = (state) => state.elections.allElections;
export const selectCurrentElection = (state) => state.elections.currentElection;
export const selectMyElections = (state) => state.elections.myElections;
export const selectActiveElections = (state) => state.elections.activeElections;
export const selectUpcomingElections = (state) => state.elections.upcomingElections;
export const selectCompletedElections = (state) => state.elections.completedElections;
export const selectElectionLoading = (state) => state.elections.isLoading;
export const selectElectionsByStatus = (status) => (state) =>
  (state.elections.allElections || []).filter((e) => (e.status || "").toLowerCase() === String(status).toLowerCase());

export default electionSlice.reducer;
