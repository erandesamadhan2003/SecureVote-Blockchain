import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    initProvider,
    checkNetwork,
    switchToSepolia,
    getContractInstances,
} from '../utils/contractHelper.js';
import { getCurrentAccount, onAccountsChanged, onChainChanged, removeListeners } from '../utils/web3Provider.js';

// Async thunk for connecting wallet
export const connectWallet = createAsyncThunk(
    'web3/connectWallet',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            // Initialize provider and get account
            const provider = initProvider();
            const account = await getCurrentAccount();

            if (!account) {
                throw new Error('No accounts found. Please connect your wallet.');
            }

            // Get network details
            const networkInfo = await checkNetwork(provider);
            const signer = await provider.getSigner();

            // Load contract instances
            const contracts = await getContractInstances(signer);

            // Set up event listeners for account and network changes
            onAccountsChanged((newAccount) => {
                if (newAccount) {
                    dispatch(updateAccount(newAccount));
                    dispatch(addNotification({
                        type: 'info',
                        message: 'Account changed',
                        description: `Connected to: ${newAccount.substring(0, 6)}...${newAccount.substring(38)}`
                    }));
                } else {
                    // Account disconnected
                    dispatch(resetWeb3());
                    dispatch(addNotification({
                        type: 'warning',
                        message: 'Wallet disconnected',
                        description: 'Your wallet has been disconnected'
                    }));
                }
            });

            onChainChanged((chainId) => {
                const isCorrectNetwork = chainId === parseInt(process.env.REACT_APP_CHAIN_ID);
                dispatch(updateNetwork({
                    chainId,
                    isCorrectNetwork
                }));

                if (!isCorrectNetwork) {
                    dispatch(addNotification({
                        type: 'warning',
                        message: 'Wrong network',
                        description: 'Please switch to Sepolia Testnet'
                    }));
                }
            });

            return {
                account,
                provider,
                signer,
                contracts,
                chainId: networkInfo.chainId,
                isCorrectNetwork: networkInfo.isCorrectNetwork,
            };
        } catch (error) {
            console.error('Wallet connection error:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for switching network
export const switchNetwork = createAsyncThunk(
    'web3/switchNetwork',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            await switchToSepolia();
            const provider = initProvider();
            const networkInfo = await checkNetwork(provider);

            dispatch(addNotification({
                type: 'success',
                message: 'Network switched',
                description: 'Successfully switched to Sepolia Testnet'
            }));

            return networkInfo;
        } catch (error) {
            console.error('Network switch error:', error);

            dispatch(addNotification({
                type: 'error',
                message: 'Network switch failed',
                description: error.message
            }));

            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for disconnecting wallet
export const disconnectWallet = createAsyncThunk(
    'web3/disconnectWallet',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            // Remove all event listeners
            removeListeners();

            dispatch(addNotification({
                type: 'info',
                message: 'Wallet disconnected',
                description: 'Successfully disconnected your wallet'
            }));

            return {};
        } catch (error) {
            console.error('Wallet disconnection error:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for loading contract instances (separate from connection)
export const loadContracts = createAsyncThunk(
    'web3/loadContracts',
    async (signer, { rejectWithValue }) => {
        try {
            const contracts = await getContractInstances(signer);
            return contracts;
        } catch (error) {
            console.error('Contract loading error:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Async thunk for adding an election contract to cache
export const addElectionContractToCache = createAsyncThunk(
    'web3/addElectionContract',
    async ({ address, signer }, { rejectWithValue }) => {
        try {
            const { getElectionContract } = await import('../utils/contractHelper');
            const electionContract = getElectionContract(address, signer);

            return {
                address,
                contract: electionContract
            };
        } catch (error) {
            console.error('Error adding election contract:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Initial state
const initialState = {
    account: null,
    chainId: null,
    provider: null,
    signer: null,
    contracts: {
        roles: null,
        factory: null,
        elections: {}, // Map of election address -> contract instance
    },
    isConnected: false,
    isCorrectNetwork: false,
    loading: false,
    error: null,
};

// Web3 slice
const web3Slice = createSlice({
    name: 'web3',
    initialState,
    reducers: {
        // Reset web3 state
        resetWeb3: (state) => {
            removeListeners();
            return initialState;
        },

        // Update account (for account changes)
        updateAccount: (state, action) => {
            state.account = action.payload;
            // If account becomes null, mark as disconnected
            if (!action.payload) {
                state.isConnected = false;
            }
        },

        // Update network (for network changes)
        updateNetwork: (state, action) => {
            state.chainId = action.payload.chainId;
            state.isCorrectNetwork = action.payload.isCorrectNetwork;
        },

        // Set contracts manually if needed
        setContracts: (state, action) => {
            state.contracts = { ...state.contracts, ...action.payload };
        },

        // Add election contract to cache
        addElectionContract: (state, action) => {
            const { address, contract } = action.payload;
            state.contracts.elections[address] = contract;
        },

        // Clear error
        clearError: (state) => {
            state.error = null;
        },

        // Set loading state
        setLoading: (state, action) => {
            state.loading = action.payload;
        },

        // Update connection status
        setConnected: (state, action) => {
            state.isConnected = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Connect Wallet
            .addCase(connectWallet.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(connectWallet.fulfilled, (state, action) => {
                const { account, provider, signer, contracts, chainId, isCorrectNetwork } = action.payload;

                state.account = account;
                state.provider = provider;
                state.signer = signer;
                state.contracts = contracts;
                state.chainId = chainId;
                state.isCorrectNetwork = isCorrectNetwork;
                state.isConnected = true;
                state.loading = false;
                state.error = null;
            })
            .addCase(connectWallet.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isConnected = false;
            })

            // Switch Network
            .addCase(switchNetwork.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(switchNetwork.fulfilled, (state, action) => {
                const { chainId, isCorrectNetwork } = action.payload;
                state.chainId = chainId;
                state.isCorrectNetwork = isCorrectNetwork;
                state.loading = false;
                state.error = null;
            })
            .addCase(switchNetwork.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Disconnect Wallet
            .addCase(disconnectWallet.pending, (state) => {
                state.loading = true;
            })
            .addCase(disconnectWallet.fulfilled, (state) => {
                removeListeners();
                return initialState;
            })
            .addCase(disconnectWallet.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Load Contracts
            .addCase(loadContracts.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loadContracts.fulfilled, (state, action) => {
                state.contracts = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(loadContracts.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Add Election Contract to Cache
            .addCase(addElectionContractToCache.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addElectionContractToCache.fulfilled, (state, action) => {
                const { address, contract } = action.payload;
                state.contracts.elections[address] = contract;
                state.loading = false;
                state.error = null;
            })
            .addCase(addElectionContractToCache.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    },
});

// Export actions
export const {
    resetWeb3,
    updateAccount,
    updateNetwork,
    setContracts,
    addElectionContract,
    clearError,
    setLoading,
    setConnected,
} = web3Slice.actions;

// Selectors
export const selectWeb3 = (state) => state.web3;
export const selectAccount = (state) => state.web3.account;
export const selectIsConnected = (state) => state.web3.isConnected;
export const selectIsCorrectNetwork = (state) => state.web3.isCorrectNetwork;
export const selectChainId = (state) => state.web3.chainId;
export const selectProvider = (state) => state.web3.provider;
export const selectSigner = (state) => state.web3.signer;
export const selectContracts = (state) => state.web3.contracts;
export const selectRolesContract = (state) => state.web3.contracts.roles;
export const selectFactoryContract = (state) => state.web3.contracts.factory;
export const selectElectionContract = (address) => (state) =>
    state.web3.contracts.elections[address];
export const selectLoading = (state) => state.web3.loading;
export const selectError = (state) => state.web3.error;

// Helper selector to check if user has specific role
export const selectHasRole = (role) => (state) => {
    // This would need to be implemented based on your contract's role checking
    // For now, returns false - you'll implement this when you have the role checking logic
    return false;
};

// Helper selector to get formatted account
export const selectFormattedAccount = (state) => {
    const account = state.web3.account;
    if (!account) return null;

    return `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
};

// Helper selector to get connection status summary
export const selectConnectionStatus = (state) => {
    const { isConnected, isCorrectNetwork, account } = state.web3;

    if (!isConnected || !account) {
        return 'disconnected';
    }

    if (!isCorrectNetwork) {
        return 'wrong_network';
    }

    return 'connected';
};

export default web3Slice.reducer;