import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json"
    }
});

// Request interceptor — add token and ensure JSON content-type
api.interceptors.request.use(
    (config) => {
        try {
            const token = localStorage.getItem("token");
            if (token) {
                config.headers = config.headers || {};
                config.headers["Authorization"] = `Bearer ${token}`;
            }
            config.headers = config.headers || {};
            if (!config.headers["Content-Type"]) {
                config.headers["Content-Type"] = "application/json";
            }
        } catch (e) {
            // ignore localStorage errors
            console.error("Request interceptor error:", e);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

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
            window.location.href = "/login";
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
