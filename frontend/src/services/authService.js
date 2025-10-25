import api from "./api.js";

const TOKEN_KEY = "token";

const setToken = (token) => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
        // ensure axios instance uses token immediately
        if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        else delete api.defaults.headers.common["Authorization"];
    } catch (e) {
        console.warn("Unable to set token:", e);
    }
};
        
const getToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
};

const clearToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
        delete api.defaults.headers.common["Authorization"];
    } catch (e) {
        console.warn("Unable to remove token:", e);
    }
};

/**
 * login
 * - walletAddress: string
 * - signature/message: optional (backend currently accepts walletAddress only)
 * Returns { token, user }
 */
export const login = async (walletAddress, signature = null, message = null) => {
    if (!walletAddress) throw new Error("walletAddress is required");
    const payload = { walletAddress };
    if (signature) payload.signature = signature;
    if (message) payload.message = message;

    try {
        const res = await api.post("/auth/login", payload);
        const { token, user } = res || {};
        if (token) setToken(token);
        return { token, user };
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Login failed";
        throw new Error(msg);
    }
};

/**
 * register
 * - userData: object with { walletAddress, name, aadharNumber }
 */
export const register = async (userData) => {
    if (!userData || !userData.walletAddress || !userData.name || !userData.aadharNumber) {
        throw new Error("walletAddress, name and aadharNumber are required");
    }
    try {
        const res = await api.post("/auth/register", {
            walletAddress: userData.walletAddress,
            name: userData.name,
            aadharNumber: userData.aadharNumber
        });
        const { token, user } = res || {};
        if (token) setToken(token);
        return { token, user };
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Registration failed";
        throw new Error(msg);
    }
};

/**
 * getProfile
 * Uses stored token via api interceptor / axios defaults
 */
export const getProfile = async () => {
    const token = getToken();
    if (!token) throw new Error("No auth token available");
    try {
        const res = await api.get("/auth/profile");
        return res?.user ?? res;
    } catch (err) {
        const msg = err?.message || (err?.data && err.data.message) || "Failed to fetch profile";
        throw new Error(msg);
    }
};

/**
 * logout
 * - calls backend logout (optional) and clears local token
 */
export const logout = async () => {
    try {
        await api.post("/auth/logout");
    } catch {
        // ignore server logout errors
    } finally {
        clearToken();
    }
};

export default {
    login,
    register,
    getProfile,
    logout,
    setToken,
    getToken,
    clearToken
};
