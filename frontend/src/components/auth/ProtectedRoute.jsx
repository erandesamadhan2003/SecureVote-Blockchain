// implement protected routes based on authentication and roles
import React, { useEffect } from "react";
import { Navigate, Outlet, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { openModal } from "../../redux/slices/uiSlice.js";

// Simple 403 UI
const Unauthorized = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="bg-white p-6 rounded shadow text-center max-w-lg">
      <h1 className="text-2xl font-semibold mb-2">403 — Unauthorized</h1>
      <p className="text-sm text-gray-600 mb-4">You don't have permission to view this page.</p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/" className="px-4 py-2 bg-gray-100 rounded">Home</Link>
        <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded">Dashboard</Link>
      </div>
    </div>
  </div>
);

const roleMatches = (userRole, required) => {
  if (!required) return true;
  const u = String(userRole || "").toUpperCase();
  // SUPER_ADMIN bypasses all checks
  if (u === "SUPER_ADMIN") return true;

  // required can be string or array
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.map((r) => String(r || "").toUpperCase()).includes(u);
};

const ProtectedRoute = ({ requiredRole }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth || {});

  useEffect(() => {
    if (!isAuthenticated) {
      // Open login modal when an unauthenticated user hits a protected route
      try { dispatch(openModal("login")); } catch (e) { /* ignore */ }
    }
  }, [isAuthenticated, dispatch]);

  if (!isAuthenticated) {
    // Redirect to home (login modal will be opened by effect)
    return <Navigate to="/" replace />;
  }

  // if requiredRole is provided, check permissions (SUPER_ADMIN bypasses)
  if (requiredRole) {
    const userRole = (user?.role || "").toString().toUpperCase();
    const allowed = roleMatches(userRole, requiredRole);
    if (!allowed) {
      return <Unauthorized />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
