import React from "react";

export default function Card({ title, children, footer, className = "" }) {
  return (
    <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
      {title ? (
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        </div>
      ) : null}
      <div className="p-4">{children}</div>
      {footer ? <div className="px-4 py-3 border-t bg-gray-50">{footer}</div> : null}
    </div>
  );
}
