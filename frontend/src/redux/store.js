//  configure and create the Redux store
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import electionReducer from "./slices/electionSlice.js";
import candidateReducer from "./slices/candidateSlice.js";
import voteReducer from "./slices/voteSlice.js";
import uiReducer from "./slices/uiSlice.js";

const store = configureStore({
    reducer: {
        auth: authReducer,
        elections: electionReducer,
        candidates: candidateReducer,
        votes: voteReducer,
        ui: uiReducer
    }
});

export default store;

// Optional typed helpers if using TS or for clarity in JS projects
export const getStore = () => store;
export const dispatch = store.dispatch;
