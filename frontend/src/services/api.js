import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : "http://localhost:3000/api";

const api = axios.create({
    baseURL: BASE,
    headers: {
        "Content-Type": "application/json"
    }
});

// If a token exists in localStorage (set by authService), apply it to axios defaults so page reloads keep authenticated requests working
try {
    const token = localStorage.getItem("token");
    if (token) {
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
} catch (e) {
    // ignore localStorage access errors in some environments
    // eslint-disable-next-line no-console
    console.warn("Unable to read token from localStorage:", e?.message || e);
}

// Response interceptor — return response.data and handle common errors
api.interceptors.response.use(
    (response) => {
        // normalize to response.data for callers
        return response?.data ?? response;
    },
    (error) => {
        // Network / CORS / no response
        if (!error.response) {
            console.error("Network error:", error);
            // Optionally surface to user
            alert("Network error. Check your connection.");
            return Promise.reject({ message: "Network error" });
        }

        const { status, data } = error.response;

        if (status === 401) {
            // Unauthorized — clear token and redirect to login
            try {
                localStorage.removeItem("token");
            } catch (e) {
                /* ignore */
            }
            // Redirect to login page (adjust path if your app uses a different route)
            // window.location.href = "/";
            return Promise.reject(data || { message: "Unauthorized" });
        }

        if (status === 403) {
            // Forbidden
            alert("You are not authorized to perform this action.");
            return Promise.reject(data || { message: "Forbidden" });
        }

        if (status >= 500) {
            // Server error
            console.error("Server error:", data);
            alert("Server error. Please try again later.");
            return Promise.reject(data || { message: "Server error" });
        }

        // Other client errors: forward server-provided payload or statusText
        return Promise.reject(data || error.response.statusText || { message: "Request failed" });
    }
);

export default api;
