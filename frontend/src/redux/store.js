import { configureStore } from '@reduxjs/toolkit';
import web3Slice from './slices/web3Slice';
import electionSlice from './slices/electionSlice';
import userSlice from './slices/userSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    web3: web3Slice,
    elections: electionSlice,
    user: userSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'web3/setProvider',
          'web3/setSigner', 
          'web3/setContracts',
          'web3/updateAccount'
        ],
        ignoredPaths: [
          'web3.provider',
          'web3.signer',
          'web3.contracts'
        ],
      },
    }),
});

export default store;