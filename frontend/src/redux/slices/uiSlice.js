import { createSlice } from "@reduxjs/toolkit";

const initialState = {
	sidebarOpen: true,
	modals: {
		login: false,
		register: false,
		voteConfirm: false
	},
	toasts: [], // { id, type, message, duration }
	theme: "light",
	loading: {
		global: false,
		component: {}
	}
};

const uiSlice = createSlice({
	name: "ui",
	initialState,
	reducers: {
		toggleSidebar(state) {
			state.sidebarOpen = !state.sidebarOpen;
		},
		openModal(state, action) {
			const name = action.payload;
			if (typeof name === "string") state.modals[name] = true;
		},
		closeModal(state, action) {
			const name = action.payload;
			if (typeof name === "string") state.modals[name] = false;
		},
		closeAllModals(state) {
			Object.keys(state.modals).forEach((k) => (state.modals[k] = false));
		},
		addToast(state, action) {
			const { type = "info", message = "", duration = 5000 } = action.payload || {};
			const id = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
			state.toasts.push({ id, type, message, duration });
		},
		removeToast(state, action) {
			const id = action.payload;
			state.toasts = state.toasts.filter((t) => t.id !== id);
		},
		setTheme(state, action) {
			const t = action.payload;
			if (t === "light" || t === "dark") state.theme = t;
		},
		setGlobalLoading(state, action) {
			state.loading.global = !!action.payload;
		},
		setComponentLoading(state, action) {
			const { component, loading } = action.payload || {};
			if (!component) return;
			if (loading) state.loading.component[component] = true;
			else delete state.loading.component[component];
		}
	}
});

export const {
	toggleSidebar,
	openModal,
	closeModal,
	closeAllModals,
	addToast,
	removeToast,
	setTheme,
	setGlobalLoading,
	setComponentLoading
} = uiSlice.actions;

// Selectors
export const selectSidebarOpen = (state) => state.ui.sidebarOpen;
export const selectModalOpen = (modalName) => (state) => !!state.ui.modals[modalName];
export const selectToasts = (state) => state.ui.toasts;
export const selectTheme = (state) => state.ui.theme;
export const selectIsLoading = (state) => state.ui.loading.global;
export const selectComponentLoading = (component) => (state) =>
	Boolean(state.ui.loading.component[component]);

export default uiSlice.reducer;
