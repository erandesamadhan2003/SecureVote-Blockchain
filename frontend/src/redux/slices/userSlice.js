import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Async thunk for wallet login
export const walletLogin = createAsyncThunk(
    'user/walletLogin',
    async ({ walletAddress, signature }, { rejectWithValue }) => {
        try {
            const response = await axios.post('/api/auth/wallet-login', {
                walletAddress,
                signature,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

// Async thunk for verifying token
export const verifyToken = createAsyncThunk(
    'user/verifyToken',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await axios.get('/api/auth/verify', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return response.data;
        } catch (error) {
            localStorage.removeItem('authToken');
            return rejectWithValue(error.response?.data?.message || 'Token verification failed');
        }
    }
);

const userSlice = createSlice({
    name: 'user',
    initialState: {
        walletAddress: null,
        roles: [],
        isAuthenticated: false,
        loading: false,
        error: null,
    },
    reducers: {
        logout: (state) => {
            localStorage.removeItem('authToken');
            state.walletAddress = null;
            state.roles = [];
            state.isAuthenticated = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Wallet Login
            .addCase(walletLogin.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(walletLogin.fulfilled, (state, action) => {
                const { user, token } = action.payload;
                state.walletAddress = user.walletAddress;
                state.roles = [user.role];
                state.isAuthenticated = true;
                state.loading = false;
                state.error = null;

                // Store token in localStorage
                localStorage.setItem('authToken', token);
            })
            .addCase(walletLogin.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            })
            // Verify Token
            .addCase(verifyToken.pending, (state) => {
                state.loading = true;
            })
            .addCase(verifyToken.fulfilled, (state, action) => {
                const { user } = action.payload;
                state.walletAddress = user.walletAddress;
                state.roles = [user.role];
                state.isAuthenticated = true;
                state.loading = false;
                state.error = null;
            })
            .addCase(verifyToken.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            });
    },
});

export const { logout, clearError } = userSlice.actions;
export default userSlice.reducer;