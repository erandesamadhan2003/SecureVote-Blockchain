import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import {
    callContractMethod,
    sendTransaction,
    estimateGas,
    formatElectionData,
    formatCandidateData
} from '../utils/contractHelper.js';
import { addNotification, openTransactionModal, updateTransactionModal, closeTransactionModal } from '../slices/uiSlice';

// Thunk to fetch elections from backend
export const fetchElections = createAsyncThunk(
    'elections/fetchElections',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const response = await axios.get('/api/elections', { params: filters });
            return response.data.data;
        } catch (error) {
            console.error('Error fetching elections:', error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch elections');
        }
    }
);

// Thunk to fetch single election details
export const fetchElectionDetail = createAsyncThunk(
    'elections/fetchElectionDetail',
    async (electionId, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/elections/${electionId}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching election details:', error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch election details');
        }
    }
);

// Thunk to create new election
export const createElection = createAsyncThunk(
    'elections/createElection',
    async (electionData, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const { factory } = state.web3.contracts;
            const { signer } = state.web3;

            if (!factory || !signer) {
                throw new Error('Wallet not connected or contracts not loaded');
            }

            const {
                name,
                description,
                registrationDeadline,
                startTime,
                endTime
            } = electionData;

            // Convert dates to timestamps
            const regDeadline = Math.floor(new Date(registrationDeadline).getTime() / 1000);
            const start = Math.floor(new Date(startTime).getTime() / 1000);
            const end = Math.floor(new Date(endTime).getTime() / 1000);

            // Estimate gas first
            const gasEstimate = await estimateGas(factory, 'createElection', [
                name,
                description,
                regDeadline,
                start,
                end
            ]);

            // Open transaction modal
            dispatch(openTransactionModal({
                hash: null,
                status: 'pending',
                message: 'Creating election...'
            }));

            // Send transaction
            const txResult = await sendTransaction(factory, 'createElection', [
                name,
                description,
                regDeadline,
                start,
                end
            ], {
                gasLimit: Math.floor(gasEstimate * 1.2) // 20% buffer
            });

            // Update transaction modal with hash
            dispatch(updateTransactionModal({
                hash: txResult.transactionHash,
                status: 'pending',
                message: 'Waiting for confirmation...'
            }));

            // Wait for additional confirmations if needed
            if (txResult.status === 'success') {
                dispatch(updateTransactionModal({
                    status: 'success',
                    message: 'Election created successfully!'
                }));

                dispatch(addNotification({
                    type: 'success',
                    message: 'Election Created',
                    description: `${name} has been created successfully`
                }));

                // Return the transaction result and basic election data
                return {
                    transaction: txResult,
                    election: {
                        name,
                        description,
                        registrationDeadline: new Date(registrationDeadline),
                        startTime: new Date(startTime),
                        endTime: new Date(endTime)
                    }
                };
            } else {
                throw new Error('Transaction failed');
            }

        } catch (error) {
            console.error('Error creating election:', error);

            dispatch(updateTransactionModal({
                status: 'error',
                message: 'Failed to create election'
            }));

            dispatch(addNotification({
                type: 'error',
                message: 'Election Creation Failed',
                description: error.message
            }));

            return rejectWithValue(error.message);
        } finally {
            // Close modal after delay
            setTimeout(() => {
                dispatch(closeTransactionModal());
            }, 3000);
        }
    }
);

// Thunk to fetch elections from blockchain
export const fetchElectionsFromChain = createAsyncThunk(
    'elections/fetchFromChain',
    async (_, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const { factory } = state.web3.contracts;

            if (!factory) {
                throw new Error('Factory contract not loaded');
            }

            // Get all election addresses from factory
            const electionAddresses = await callContractMethod(factory, 'getAllElections');

            const elections = [];

            // Fetch details for each election
            for (const address of electionAddresses) {
                try {
                    const electionContract = await dispatch(getElectionContractInstance(address)).unwrap();
                    const electionInfo = await callContractMethod(electionContract, 'getElectionInfo');

                    const formattedElection = formatElectionData(electionInfo);
                    if (formattedElection) {
                        elections.push({
                            ...formattedElection,
                            contractAddress: address
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching election ${address}:`, error);
                    // Continue with other elections even if one fails
                }
            }

            dispatch(addNotification({
                type: 'success',
                message: 'Elections Synced',
                description: `Loaded ${elections.length} elections from blockchain`
            }));

            return elections;
        } catch (error) {
            console.error('Error fetching elections from chain:', error);
            dispatch(addNotification({
                type: 'error',
                message: 'Sync Failed',
                description: 'Failed to load elections from blockchain'
            }));
            return rejectWithValue(error.message);
        }
    }
);

// Thunk to get election contract instance
export const getElectionContractInstance = createAsyncThunk(
    'elections/getContractInstance',
    async (electionAddress, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const { signer, contracts } = state.web3;

            // Check if already cached
            if (contracts.elections[electionAddress]) {
                return contracts.elections[electionAddress];
            }

            if (!signer) {
                throw new Error('Wallet not connected');
            }

            // Use correct relative path and include .js extension so Vite can resolve the module
            const { getElectionContract } = await import('../utils/contractHelper.js');
            const electionContract = getElectionContract(electionAddress, signer);

            // Add to cache
            dispatch(addElectionContract({ address: electionAddress, contract: electionContract }));

            return electionContract;
        } catch (error) {
            console.error('Error getting election contract:', error);
            return rejectWithValue(error.message);
        }
    }
);

// Thunk to change election status
export const changeElectionStatus = createAsyncThunk(
    'elections/changeStatus',
    async ({ electionAddress, newStatus }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const electionContract = state.web3.contracts.elections[electionAddress];

            if (!electionContract) {
                throw new Error('Election contract not loaded');
            }

            const statusMethods = {
                'Registration': 'startRegistration',
                'Voting': 'startVoting',
                'Ended': 'endElection',
                'ResultDeclared': 'declareResults'
            };

            const method = statusMethods[newStatus];
            if (!method) {
                throw new Error(`Invalid status transition: ${newStatus}`);
            }

            dispatch(openTransactionModal({
                status: 'pending',
                message: `Changing election status to ${newStatus}...`
            }));

            const txResult = await sendTransaction(electionContract, method, []);

            dispatch(updateTransactionModal({
                hash: txResult.transactionHash,
                status: 'success',
                message: `Election status changed to ${newStatus}`
            }));

            dispatch(addNotification({
                type: 'success',
                message: 'Status Updated',
                description: `Election status changed to ${newStatus}`
            }));

            return { electionAddress, newStatus, transaction: txResult };
        } catch (error) {
            console.error('Error changing election status:', error);

            dispatch(updateTransactionModal({
                status: 'error',
                message: 'Failed to change election status'
            }));

            dispatch(addNotification({
                type: 'error',
                message: 'Status Change Failed',
                description: error.message
            }));

            return rejectWithValue(error.message);
        } finally {
            setTimeout(() => {
                dispatch(closeTransactionModal());
            }, 3000);
        }
    }
);