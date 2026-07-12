"use client";
// components/ui/Badge.jsx
import React from "react";

const variants = {
  default:     "bg-blue-100 text-blue-800",
  secondary:   "bg-gray-100 text-gray-800",
  destructive: "bg-red-100 text-red-800",
  outline:     "border border-gray-300 text-gray-700",
  success:     "bg-green-100 text-green-800",
  warning:     "bg-amber-100 text-amber-800",
};

export default function Badge({ children, variant = "default" }) {
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[variant] ?? variants.default}`}>
      {children}
    </span>
  );
}
