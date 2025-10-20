import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for fetching elections
export const fetchElections = createAsyncThunk(
    'elections/fetchElections',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get('/api/elections', { params: filters });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch elections');
        }
    }
);

// Async thunk for fetching single election
export const fetchElectionDetail = createAsyncThunk(
    'elections/fetchElectionDetail',
    async (electionId, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/elections/${electionId}`);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch election details');
        }
    }
);

const electionSlice = createSlice({
    name: 'elections',
    initialState: {
        list: [],
        currentElection: null,
        loading: false,
        error: null,
    },
    reducers: {
        clearCurrentElection: (state) => {
            state.currentElection = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Elections
            .addCase(fetchElections.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchElections.fulfilled, (state, action) => {
                state.list = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(fetchElections.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Election Detail
            .addCase(fetchElectionDetail.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchElectionDetail.fulfilled, (state, action) => {
                state.currentElection = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(fetchElectionDetail.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

export const { clearCurrentElection, clearError } = electionSlice.actions;
export default electionSlice.reducer;