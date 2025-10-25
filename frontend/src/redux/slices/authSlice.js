import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { login, register, getProfile, logout, setToken, getToken, clearToken } from "../../services/authService.js";

const initialToken = getToken();

const initialState = {
    walletAddress: null,
    user: null,
    token: initialToken,
    isAuthenticated: !!initialToken,
    isLoading: false,
    error: null
};

export const connectWallet = createAsyncThunk("auth/connectWallet", async (_, { rejectWithValue }) => {
    try {
        // Request account access if needed
        if (!window.ethereum) {
            throw new Error("MetaMask is not installed");
        }
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const walletAddress = accounts[0];
        
        const message = `Sign this message to authenticate your wallet: ${walletAddress}`;
        const signature = await window.ethereum.request({
            method: "personal_sign",
            params: [message, walletAddress]
        });

        // Call authService.login() with walletAddress and signature
        const response = await login(walletAddress, signature);

        // store token via authService helper so axios header is set
        if (response?.token) setToken(response.token);

        return { walletAddress, user: response.user };
    } catch (err) {
        return rejectWithValue(err.message);
    }
});

export const registerUser = createAsyncThunk("auth/registerUser", async (userData, { rejectWithValue }) => {
    try {
        const response = await register(userData);
        return response.user;
    } catch (err) {
        return rejectWithValue(err.message);
    }
});

export const fetchUserProfile = createAsyncThunk("auth/fetchUserProfile", async (_, { rejectWithValue }) => {
    try {
        const response = await getProfile();
        return response.user;
    } catch (err) {
        return rejectWithValue(err.message);
    }
});

export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        logoutState: (state) => {
            clearToken();
            state.walletAddress = null;
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(connectWallet.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(connectWallet.fulfilled, (state, action) => {
                state.isLoading = false;
                state.walletAddress = action.payload.walletAddress;
                state.user = action.payload.user;
                state.token = getToken();
                state.isAuthenticated = !!state.token;
            })
            .addCase(connectWallet.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
                state.token = getToken();
                state.isAuthenticated = !!state.token;
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchUserProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(fetchUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
});

export const { logoutState, setError, clearError } = authSlice.actions;

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectUser = (state) => state.auth.user;
export const selectUserRole = (state) => (state.auth.user ? state.auth.user.role : null);
export const selectWalletAddress = (state) => state.auth.walletAddress;
export const selectAuthLoading = (state) => state.auth.isLoading;
export const selectAuthError = (state) => state.auth.error;

export default authSlice.reducer;
