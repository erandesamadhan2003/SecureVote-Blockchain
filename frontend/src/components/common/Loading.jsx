import React from "react";

const SIZE_MAP = {
  small: "w-4 h-4 border-2",
  medium: "w-6 h-6 border-4",
  large: "w-10 h-10 border-4"
};

/**
 * Props:
 * - size: "small" | "medium" | "large"
 * - fullscreen: boolean
 * - text: optional string
 */
export default function Loading({ size = "medium", fullscreen = false, text = "" }) {
  const spinnerClass = SIZE_MAP[size] || SIZE_MAP.medium;
  const wrapperCls = fullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    : "inline-flex items-center";

  return (
    <div className={wrapperCls}>
      <div className="flex items-center space-x-3">
        <div className={`${spinnerClass} rounded-full border-t-primary animate-spin`} />
        {text ? <span className="text-sm text-gray-700">{text}</span> : null}
      </div>
    </div>
  );
}
