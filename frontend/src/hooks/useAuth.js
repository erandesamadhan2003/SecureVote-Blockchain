import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import useWallet from "./useWallet.js";
import {
    connectWallet,
    logoutState,
    selectIsAuthenticated,
    selectUser,
    selectWalletAddress,
    selectAuthLoading,
    selectUserRole
} from "../redux/slices/authSlice.js";
import authService from "../services/authService.js";

export default function useAuth() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const walletAddressFromStore = useSelector(selectWalletAddress);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isLoading = useSelector(selectAuthLoading);
    const role = useSelector(selectUserRole);

    // local wallet hook (for direct wallet operations if needed)
    const wallet = useWallet();

    const walletAddress = walletAddressFromStore || wallet.walletAddress || null;

    const login = useCallback(async () => {
        // dispatch the connectWallet thunk (it handles requesting accounts, signing and backend login)
        const action = await dispatch(connectWallet());
        // action may be rejected; return action payload or throw
        if (action.error) throw new Error(action.error.message || "Login failed");
        return action.payload;
    }, [dispatch]);

    const logout = useCallback(async () => {
        try {
            // attempt server-side logout
            await authService.logout();
        } catch (e) {
            // ignore server errors but proceed to clear local state
        } finally {
            dispatch(logoutState());
        }
    }, [dispatch]);

    const hasRole = useCallback(
        (roleName) => {
            if (!roleName) return false;
            if (!user || !user.role) return false;
            return String(user.role).toUpperCase() === String(roleName).toUpperCase();
        },
        [user]
    );

    const isSuperAdmin = hasRole("SUPER_ADMIN");
    const isManager = hasRole("ELECTION_MANAGER");
    const isAuthority = hasRole("ELECTION_AUTHORITY");
    const isVoter = hasRole("VOTER");

    return {
        user,
        walletAddress,
        isAuthenticated,
        isLoading,
        role,
        login,
        logout,
        hasRole,
        isSuperAdmin,
        isManager,
        isAuthority,
        isVoter,
        // expose wallet utilities for callers that need them
        wallet
    };
}
