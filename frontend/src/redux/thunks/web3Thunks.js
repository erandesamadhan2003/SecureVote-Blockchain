import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    callContractMethod,
    sendTransaction,
    estimateGas,
    checkUserRole,
    getUserRoles,
    formatElectionData,
    formatCandidateData
} from '../utils/contractHelper.js';
import { addNotification } from '../slices/uiSlice';

// Thunk to check and update user roles
export const updateUserRoles = createAsyncThunk(
    'web3/updateUserRoles',
    async (_, { getState, rejectWithValue, dispatch }) => {
        try {
            const state = getState();
            const { account, contracts } = state.web3;

            if (!account || !contracts.roles) {
                throw new Error('Wallet not connected or roles contract not loaded');
            }

            const roles = await getUserRoles(contracts.roles, account);

            dispatch(addNotification({
                type: 'success',
                message: 'Roles updated',
                description: `Your roles: ${roles.join(', ') || 'VOTER'}`
            }));

            return { roles };
        } catch (error) {
            console.error('Error updating user roles:', error);
            dispatch(addNotification({
                type: 'error',
                message: 'Failed to update roles',
                description: error.message
            }));
            return rejectWithValue(error.message);
        }
    }
);

// Thunk to check if user can perform an action
export const checkUserPermission = createAsyncThunk(
    'web3/checkPermission',
    async ({ action, electionAddress }, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const { account, contracts } = state.web3;

            if (!account) {
                throw new Error('Wallet not connected');
            }

            // Implementation depends on your contract's permission system
            // This is a placeholder - you'll need to implement based on your contract logic
            const hasPermission = true; // Replace with actual contract call

            return { action, hasPermission };
        } catch (error) {
            console.error('Error checking permission:', error);
            return rejectWithValue(error.message);
        }
    }
);