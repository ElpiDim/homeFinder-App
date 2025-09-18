import React from "react";
import { Link } from "react-router-dom";

const euro = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n;

export default function PropertyCard({
  prop,
  isFavorite = false,
  onToggleFavorite = () => {},
  imgUrl = (src) => src, // πέρασε τη δική σου helper αν θες
  showFavorite = true,
  children,
}) {
  const cover = prop?.images?.[0]
    ? imgUrl(prop.images[0])
    : "https://placehold.co/800x450?text=No+Image";
  const typeLabel = prop?.type || "-";
  const rent = prop?.rent != null ? `€ ${euro(Number(prop.rent))}` : "—";
  const location = prop?.address || prop?.location || "—";

  return (
    <div className="pcard shadow-sm rounded-4 overflow-hidden">
      {/* IMAGE */}
      <Link to={`/property/${prop._id}`} className="text-decoration-none">
        <div className="pcard-media">
          <img src={cover} alt={prop?.title || "Property"} loading="lazy" />

          {/* overlay badges */}
          <div className="pcard-overlay d-flex gap-2">
            <span className="badge bg-dark bg-opacity-75 text-white rounded-pill p-2 px-3">
              {rent}
            </span>
            <span
              className={`badge rounded-pill p-2 px-3 ${
                typeLabel === "rent" ? "bg-info" : "bg-primary"
              }`}
            >
              {typeLabel}
            </span>
          </div>

          {/* favorite (hidden when showFavorite === false) */}
          {showFavorite && (
            <button
              type="button"
              className={`pcard-fav ${isFavorite ? "is-active" : ""}`}
              aria-label="favorite"
              onClick={(e) => {
                e.preventDefault();
                onToggleFavorite(prop._id);
              }}
            >
              {isFavorite ? "★" : "☆"}
            </button>
          )}
        </div>
      </Link>

      {/* BODY */}
      <div className="bg-white p-3">
        <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
          <h5 className="fw-semibold mb-1 text-truncate">
            {prop?.title || "Untitled property"}
          </h5>
        </Link>

        <div className="text-muted small d-flex align-items-center gap-1">
          <span>📍</span>
          <span className="text-truncate">{location}</span>
        </div>

        {/* quick facts line */}
        <div className="d-flex flex-wrap gap-2 mt-2 small">
          {prop?.bedrooms != null && <span className="pcard-chip">🛏 {prop.bedrooms}</span>}
          {prop?.bathrooms != null && <span className="pcard-chip">🛁 {prop.bathrooms}</span>}
          {(prop?.squareMeters || prop?.surface) && (
            <span className="pcard-chip">📐 {prop.squareMeters || prop.surface} m²</span>
          )}
          {prop?.floor != null && <span className="pcard-chip">⬆️ Floor {prop.floor}</span>}
        </div>

        {children}
      </div>
    </div>
  );
}
