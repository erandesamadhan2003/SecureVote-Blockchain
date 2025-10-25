import React from "react";
import { toast } from "sonner";
// import { toast } from "sonner";


/**
 * Presentational Toast (not required by sonner but provided if you want a custom renderer)
 * Props: id, type, message, onClose
 */
export function Toast({ id, type = "info", message = "", onClose = () => {} }) {
  const base = "px-4 py-2 rounded-md shadow";
  const typeCls =
    type === "success"
      ? "bg-green-50 text-green-800"
      : type === "error"
      ? "bg-red-50 text-red-800"
      : type === "warning"
      ? "bg-yellow-50 text-yellow-800"
      : "bg-blue-50 text-blue-800";
  return (
    <div id={id} className={`${base} ${typeCls}`}>
      <div className="text-sm">{message}</div>
      <div className="text-xs text-gray-500 mt-1">
        <button onClick={onClose}>Dismiss</button>
      </div>
    </div>
  );
}

// Convenience helpers using sonner toast
export const showSuccess = (msg) => toast.success(msg);
export const showError = (msg) => toast.error(msg);
export const showInfo = (msg) => toast(message => toast(message)); // fallback
export const showWarning = (msg) => toast(msg); // sonner doesn't have warning helper; use default
