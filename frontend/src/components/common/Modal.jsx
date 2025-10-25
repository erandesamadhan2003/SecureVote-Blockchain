import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import Button from "./Button.jsx";

const SIZE_MAP = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-3xl"
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "medium",
  showCloseButton = true
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose && onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative z-10 w-full px-4 ${SIZE_MAP[size] || SIZE_MAP.medium}`}>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {showCloseButton ? (
              <Button variant="outline" size="small" onClick={onClose}>
                Close
              </Button>
            ) : null}
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
