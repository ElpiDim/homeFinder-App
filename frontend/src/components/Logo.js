// src/components/Logo.js
import React from "react";

// Πρόσθεσα το "...props" για να μπορούμε να περνάμε styles απ' έξω
export default function Logo({ as: Tag = "h1", className = "", children, ...props }) {
  const classes = ["logo-wrap", "logo-baloo", className].filter(Boolean).join(" ");
  
  return (
    // Περνάμε τα ...props στο Tag (εδώ θα μπει το style={{ color: 'white' }})
    <Tag className={classes} {...props}>
      {/* Το color: inherit αναγκάζει το span να πάρει το χρώμα του γονέα */}
      <span className="logo-word" style={{ color: 'inherit' }}>
        {children || "homie!"}
      </span>
    </Tag>
  );
}