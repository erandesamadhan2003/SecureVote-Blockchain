import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    addNotification,
    removeNotification,
    clearNotifications,
    openTransactionModal,
    updateTransactionModal,
    closeTransactionModal,
    openConfirmationModal,
    closeConfirmationModal,
    toggleTheme,
    setTheme
} from '../redux/slices/uiSlice';

/**
 * Hook for UI state management
 */
export const useUI = () => {
    const dispatch = useDispatch();
    const uiState = useSelector(state => state.ui);

    // Notifications
    const showNotification = useCallback((notification) => {
        dispatch(addNotification(notification));
    }, [dispatch]);

    const hideNotification = useCallback((id) => {
        dispatch(removeNotification(id));
    }, [dispatch]);

    const clearAllNotifications = useCallback(() => {
        dispatch(clearNotifications());
    }, [dispatch]);

    // Transaction Modal
    const showTransactionModal = useCallback((modalProps = {}) => {
        dispatch(openTransactionModal(modalProps));
    }, [dispatch]);

    const updateTransaction = useCallback((updates) => {
        dispatch(updateTransactionModal(updates));
    }, [dispatch]);

    const hideTransactionModal = useCallback(() => {
        dispatch(closeTransactionModal());
    }, [dispatch]);

    // Confirmation Modal
    const showConfirmationModal = useCallback((modalProps) => {
        dispatch(openConfirmationModal(modalProps));
    }, [dispatch]);

    const hideConfirmationModal = useCallback(() => {
        dispatch(closeConfirmationModal());
    }, [dispatch]);

    // Theme
    const toggleAppTheme = useCallback(() => {
        dispatch(toggleTheme());
    }, [dispatch]);

    const changeTheme = useCallback((theme) => {
        dispatch(setTheme(theme));
    }, [dispatch]);

    // Quick notification helpers
    const showSuccess = useCallback((message, description = '') => {
        showNotification({
            type: 'success',
            message,
            description
        });
    }, [showNotification]);

    const showError = useCallback((message, description = '') => {
        showNotification({
            type: 'error',
            message,
            description
        });
    }, [showNotification]);

    const showInfo = useCallback((message, description = '') => {
        showNotification({
            type: 'info',
            message,
            description
        });
    }, [showNotification]);

    const showWarning = useCallback((message, description = '') => {
        showNotification({
            type: 'warning',
            message,
            description
        });
    }, [showNotification]);

    return {
        // State
        ...uiState,

        // Notifications
        showNotification,
        hideNotification,
        clearAllNotifications,
        showSuccess,
        showError,
        showInfo,
        showWarning,

        // Modals
        showTransactionModal,
        updateTransaction,
        hideTransactionModal,
        showConfirmationModal,
        hideConfirmationModal,

        // Theme
        toggleAppTheme,
        changeTheme,
    };
};