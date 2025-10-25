import React from "react";
import Loading from "./Loading.jsx";

const VARIANTS = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  outline: "bg-transparent border border-gray-300 text-gray-800 hover:bg-gray-50"
};

const SIZES = {
  small: "px-3 py-1 text-sm",
  medium: "px-4 py-2 text-sm",
  large: "px-6 py-3 text-base"
};

/**
 * Props:
 * - variant, size, loading, disabled, onClick, children, className
 */
export default function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  onClick,
  children,
  className = "",
  type = "button",
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const variantCls = VARIANTS[variant] || VARIANTS.primary;
  const sizeCls = SIZES[size] || SIZES.medium;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variantCls} ${sizeCls} ${className}`}
      {...rest}
    >
      {loading ? <Loading size={size === "small" ? "small" : "medium"} /> : children}
    </button>
  );
}
