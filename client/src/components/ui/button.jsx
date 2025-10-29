import React from "react";

export function Button({ children, className = "", ...props }) {
  // If no className is provided, use a default style
  const defaultClass = "bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded text-white font-semibold";
  return (
    <button
      className={className ? className : defaultClass}
      {...props}
    >
      {children}
    </button>
  );
}
