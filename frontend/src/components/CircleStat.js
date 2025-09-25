// src/components/CircleStat.js
import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function CircleStat({ value = 0, max = 100, icon = "💚", label = "Label" }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div className="d-flex flex-column align-items-center">
      <div style={{ width: 120, height: 120 }}>
        <CircularProgressbar
          value={percentage}
          strokeWidth={10}
          styles={buildStyles({
            pathColor: "#4ade80",      // πράσινο
            trailColor: "#e6f4ea",
            strokeLinecap: "round",
          })}
          text={
            <tspan dy={5} x="50%">
              <tspan x="50%" dy="-10">{icon}</tspan>
              <tspan x="50%" dy="22" style={{ fontSize: "20px", fontWeight: 700 }}>
                {value}
              </tspan>
            </tspan>
          }
        />
      </div>
      <div className="mt-2 fw-semibold">{label}</div>
    </div>
  );
}
