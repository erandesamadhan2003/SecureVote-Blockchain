import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { sendTransaction, estimateGas, callContractMethod } from '../utils/contractHelper.js';
import { addNotification, openTransactionModal, updateTransactionModal, closeTransactionModal } from '../slices/uiSlice';

// Thunk to cast a vote
export const castVote = createAsyncThunk(
    'votes/castVote',
    async ({ electionAddress, candidateId }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const electionContract = state.web3.contracts.elections[electionAddress];
            const { account } = state.web3;

            if (!electionContract) {
                throw new Error('Election contract not loaded');
            }

            if (!account) {
                throw new Error('Wallet not connected');
            }

            // Check if already voted
            try {
                const hasVoted = await callContractMethod(electionContract, 'hasVoted', [account]);
                if (hasVoted) {
                    throw new Error('You have already voted in this election');
                }
            } catch (error) {
                // If the contract doesn't have hasVoted method, continue
                console.warn('Could not check vote status:', error);
            }

            dispatch(openTransactionModal({
                status: 'pending',
                message: 'Casting your vote...'
            }));

            // Estimate gas
            const gasEstimate = await estimateGas(electionContract, 'castVote', [candidateId]);

            // Send transaction
            const txResult = await sendTransaction(electionContract, 'castVote', [candidateId], {
                gasLimit: Math.floor(gasEstimate * 1.2)
            });

            dispatch(updateTransactionModal({
                hash: txResult.transactionHash,
                status: 'success',
                message: 'Vote cast successfully!'
            }));

            // Record vote in backend
            try {
                const election = await axios.get(`/api/elections/${electionAddress}`);
                await axios.post('/api/votes', {
                    electionId: election.data.data.electionId,
                    candidateId,
                    transactionHash: txResult.transactionHash
                });
            } catch (backendError) {
                console.warn('Failed to record vote in backend:', backendError);
            }

            dispatch(addNotification({
                type: 'success',
                message: 'Vote Cast',
                description: 'Your vote has been recorded on the blockchain'
            }));

            return {
                electionAddress,
                candidateId,
                transaction: txResult
            };

        } catch (error) {
            console.error('Error casting vote:', error);

            dispatch(updateTransactionModal({
                status: 'error',
                message: 'Failed to cast vote'
            }));

            dispatch(addNotification({
                type: 'error',
                message: 'Vote Failed',
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

// Thunk to fetch user's voting history
export const fetchMyVotes = createAsyncThunk(
    'votes/fetchMyVotes',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axios.get('/api/votes/my-votes');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching voting history:', error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch voting history');
        }
    }
);

// Thunk to check if user has voted in an election
export const checkVoteStatus = createAsyncThunk(
    'votes/checkStatus',
    async (electionAddress, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const electionContract = state.web3.contracts.elections[electionAddress];
            const { account } = state.web3;

            if (!electionContract || !account) {
                throw new Error('Election contract not loaded or wallet not connected');
            }

            const hasVoted = await callContractMethod(electionContract, 'hasVoted', [account]);

            return { electionAddress, hasVoted };
        } catch (error) {
            console.error('Error checking vote status:', error);
            return rejectWithValue(error.message);
        }
    }
);