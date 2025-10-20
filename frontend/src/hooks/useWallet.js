import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    updateUserRoles
} from '../redux/thunks';
import {
    selectAccount,
    selectIsConnected,
    selectIsCorrectNetwork,
    selectChainId,
    selectLoading,
    selectError,
    selectFormattedAccount,
    selectConnectionStatus,
    clearError,
    connectWallet,
    disconnectWallet,
    switchNetwork
} from '../redux/slices/web3Slice';

/**
 * Hook for wallet connection and management
 */
export const useWallet = () => {
    const dispatch = useDispatch();

    // Selectors
    const account = useSelector(selectAccount);
    const formattedAccount = useSelector(selectFormattedAccount);
    const isConnected = useSelector(selectIsConnected);
    const isCorrectNetwork = useSelector(selectIsCorrectNetwork);
    const chainId = useSelector(selectChainId);
    const loading = useSelector(selectLoading);
    const error = useSelector(selectError);
    const connectionStatus = useSelector(selectConnectionStatus);

    // Connect wallet
    const connect = useCallback(async () => {
        try {
            const result = await dispatch(connectWallet()).unwrap();
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }, [dispatch]);

    // Disconnect wallet
    const disconnect = useCallback(async () => {
        try {
            await dispatch(disconnectWallet()).unwrap();
        } catch (error) {
            console.error('Disconnect error:', error);
        }
    }, [dispatch]);

    // Switch network
    const switchToCorrectNetwork = useCallback(async () => {
        try {
            const result = await dispatch(switchNetwork()).unwrap();
            return result;
        } catch (error) {
            throw new Error(error);
        }
    }, [dispatch]);

    // Update user roles
    const updateRoles = useCallback(async () => {
        try {
            const result = await dispatch(updateUserRoles()).unwrap();
            return result;
        } catch (error) {
            console.error('Update roles error:', error);
            throw new Error(error);
        }
    }, [dispatch]);

    // Clear errors
    const clearErrors = useCallback(() => {
        dispatch(clearError());
    }, [dispatch]);

    return {
        // State
        account,
        formattedAccount,
        isConnected,
        isCorrectNetwork,
        chainId,
        loading,
        error,
        connectionStatus,

        // Actions
        connect,
        disconnect,
        switchNetwork: switchToCorrectNetwork,
        updateRoles,
        clearErrors,

        // Derived state
        isReady: isConnected && isCorrectNetwork && !loading,
        requiresNetworkSwitch: isConnected && !isCorrectNetwork,
    };
};