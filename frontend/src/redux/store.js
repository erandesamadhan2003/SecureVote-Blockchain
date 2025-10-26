//  configure and create the Redux store
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
	FLUSH,
	REHYDRATE,
	PAUSE,
	PERSIST,
	PURGE,
	REGISTER
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage for web
import { persistReducer, persistStore } from "redux-persist";

import authReducer from "./slices/authSlice.js";
import electionReducer from "./slices/electionSlice.js";
import candidateReducer from "./slices/candidateSlice.js";
import voteReducer from "./slices/voteSlice.js";
import uiReducer from "./slices/uiSlice.js";

// combine reducers
const rootReducer = combineReducers({
	auth: authReducer,
	elections: electionReducer,
	candidates: candidateReducer,
	votes: voteReducer,
	ui: uiReducer
});

// persist config: persist auth and ui (adjust whitelist as needed)
const persistConfig = {
	key: "root",
	version: 1,
	storage,
	whitelist: ["auth", "ui"]
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER]
			}
		})
});

// create persistor
export const persistor = persistStore(store);

// convenience exports
export default store;
export const getStore = () => store;
export const dispatch = store.dispatch;
