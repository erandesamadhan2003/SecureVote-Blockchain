import React from "react";
import { Toaster } from "sonner";

/**
 * Simple wrapper around sonner's Toaster. Place this at the app root (e.g. App.jsx).
 */
export default function ToastContainer() {
  return <Toaster position="top-right" richColors />;
}
