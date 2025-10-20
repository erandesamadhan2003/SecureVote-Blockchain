import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { sendTransaction, estimateGas, callContractMethod } from '../utils/contractHelper.js';
import { addNotification, openTransactionModal, updateTransactionModal, closeTransactionModal } from '../slices/uiSlice';

// Thunk to register as candidate
export const registerCandidate = createAsyncThunk(
    'candidates/register',
    async (candidateData, { getState, rejectWithValue, dispatch }) => {
        try {
            const { electionAddress, name, party, manifesto, imageHash } = candidateData;
            const state = getState();
            const electionContract = state.web3.contracts.elections[electionAddress];

            if (!electionContract) {
                throw new Error('Election contract not loaded');
            }

            dispatch(openTransactionModal({
                status: 'pending',
                message: 'Registering as candidate...'
            }));

            // Estimate gas
            const gasEstimate = await estimateGas(electionContract, 'registerCandidate', [
                name,
                party,
                manifesto,
                imageHash
            ]);

            // Send transaction
            const txResult = await sendTransaction(electionContract, 'registerCandidate', [
                name,
                party,
                manifesto,
                imageHash
            ], {
                gasLimit: Math.floor(gasEstimate * 1.2)
            });

            dispatch(updateTransactionModal({
                hash: txResult.transactionHash,
                status: 'success',
                message: 'Candidate registration submitted!'
            }));

            // Also register in backend
            try {
                await axios.post('/api/candidates', {
                    electionId: candidateData.electionId,
                    name,
                    party,
                    manifesto,
                    imageHash
                });
            } catch (backendError) {
                console.warn('Failed to register candidate in backend:', backendError);
                // Continue even if backend registration fails
            }

            dispatch(addNotification({
                type: 'success',
                message: 'Candidate Registered',
                description: `Successfully registered as candidate for ${name}`
            }));

            return {
                transaction: txResult,
                candidate: { name, party, manifesto, imageHash }
            };

        } catch (error) {
            console.error('Error registering candidate:', error);

            dispatch(updateTransactionModal({
                status: 'error',
                message: 'Candidate registration failed'
            }));

            dispatch(addNotification({
                type: 'error',
                message: 'Registration Failed',
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

// Thunk to validate candidate (approve/reject)
export const validateCandidate = createAsyncThunk(
    'candidates/validate',
    async ({ electionAddress, candidateId, approved }, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const electionContract = state.web3.contracts.elections[electionAddress];

            if (!electionContract) {
                throw new Error('Election contract not loaded');
            }

            dispatch(openTransactionModal({
                status: 'pending',
                message: `${approved ? 'Approving' : 'Rejecting'} candidate...`
            }));

            const txResult = await sendTransaction(electionContract, 'validateCandidate', [
                candidateId,
                approved
            ]);

            dispatch(updateTransactionModal({
                hash: txResult.transactionHash,
                status: 'success',
                message: `Candidate ${approved ? 'approved' : 'rejected'}!`
            }));

            // Update backend
            try {
                await axios.put(`/api/candidates/${candidateId}/validate`, { approved });
            } catch (backendError) {
                console.warn('Failed to update candidate in backend:', backendError);
            }

            dispatch(addNotification({
                type: 'success',
                message: `Candidate ${approved ? 'Approved' : 'Rejected'}`,
                description: `Candidate has been ${approved ? 'approved' : 'rejected'}`
            }));

            return { candidateId, approved, transaction: txResult };

        } catch (error) {
            console.error('Error validating candidate:', error);

            dispatch(updateTransactionModal({
                status: 'error',
                message: `Failed to ${approved ? 'approve' : 'reject'} candidate`
            }));

            dispatch(addNotification({
                type: 'error',
                message: 'Validation Failed',
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

// Thunk to fetch candidates for election
export const fetchCandidates = createAsyncThunk(
    'candidates/fetchCandidates',
    async (electionId, { rejectWithValue }) => {
        try {
            const response = await axios.get(`/api/elections/${electionId}/candidates`);
            return {
                electionId,
                candidates: response.data.data
            };
        } catch (error) {
            console.error('Error fetching candidates:', error);
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch candidates');
        }
    }
);