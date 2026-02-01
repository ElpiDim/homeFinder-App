// src/components/Logo.js
import React from "react";

export default function Logo({ as: Tag = "h1", className = "", children }) {
  const classes = ["logo-wrap", "logo-baloo", className].filter(Boolean).join(" ");
  return (
    <Tag className={classes}>
      <span className="logo-word">{children || "homie!"}</span>
    </Tag>
  );
}
