import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        notifications: [],
        modals: {
            transaction: {
                isOpen: false,
                hash: null,
                status: null, // 'pending', 'success', 'error'
            },
            confirmation: {
                isOpen: false,
                action: null,
                data: null,
            },
        },
        theme: 'light',
    },
    reducers: {
        // Notifications
        addNotification: (state, action) => {
            state.notifications.push({
                id: Date.now(),
                ...action.payload,
            });
        },
        removeNotification: (state, action) => {
            state.notifications = state.notifications.filter(
                (notification) => notification.id !== action.payload
            );
        },
        clearNotifications: (state) => {
            state.notifications = [];
        },

        // Modals
        openTransactionModal: (state, action) => {
            state.modals.transaction = {
                isOpen: true,
                ...action.payload,
            };
        },
        updateTransactionModal: (state, action) => {
            state.modals.transaction = {
                ...state.modals.transaction,
                ...action.payload,
            };
        },
        closeTransactionModal: (state) => {
            state.modals.transaction = {
                isOpen: false,
                hash: null,
                status: null,
            };
        },

        openConfirmationModal: (state, action) => {
            state.modals.confirmation = {
                isOpen: true,
                ...action.payload,
            };
        },
        closeConfirmationModal: (state) => {
            state.modals.confirmation = {
                isOpen: false,
                action: null,
                data: null,
            };
        },

        // Theme
        toggleTheme: (state) => {
            state.theme = state.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', state.theme);
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
            localStorage.setItem('theme', action.payload);
        },
    },
});

export const {
    addNotification,
    removeNotification,
    clearNotifications,
    openTransactionModal,
    updateTransactionModal,
    closeTransactionModal,
    openConfirmationModal,
    closeConfirmationModal,
    toggleTheme,
    setTheme,
} = uiSlice.actions;

export default uiSlice.reducer;