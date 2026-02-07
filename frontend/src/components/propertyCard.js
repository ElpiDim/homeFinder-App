import React from "react";
import { Link } from "react-router-dom";
import "./PropertyCard.css";

/* ---------- helpers (images) ---------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "") || (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  const rel = clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  return `${API_ORIGIN}${rel}`;
}

const currency = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : n ?? "";

export default function PropertyCard({
  property,
  prop, // alias for backward compatibility
  matchLabel = null,
  isFavorite = false,
  onToggleFavorite,
  onSchedule,
  onMessage,
  onRemove,
  showRemoveLink = false,
  showFavorite = true,
  imgUrl, // optional external helper
  linkTo,
}) {
 const p = property ?? prop;
  if (!p || typeof p !== "object") return null;

  const propertyId = p._id ?? p.id;
  const destination = linkTo ?? (propertyId ? `/property/${propertyId}` : null);
  // Resolve image URL
  let cover = "https://via.placeholder.com/600x400?text=No+Image";
  if (p.images && p.images[0]) {
    if (imgUrl) {
      cover = imgUrl(p.images[0]);
    } else {
      cover = normalizeUploadPath(p.images[0]);
    }
  }

  // Resolve price
  // Some parts of app use .rent, others might use .price
  const priceVal = p.rent != null ? p.rent : p.price;
  const displayPrice = priceVal != null ? `€${currency(priceVal)}` : "";

  // Resolve area/size
  const areaVal = p.area ?? p.sqft ?? p.squareMeters ?? p.surface;

  return (
    <div className="pc-card">
      {/* Match Label */}
      {matchLabel && <div className="pc-match">{matchLabel}</div>}

      {/* Favorite Heart */}
      {showFavorite && (
        <button
          type="button"
          className={`pc-heart ${isFavorite ? "is-active" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite();
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <span className="material-symbols-outlined">favorite</span>
        </button>
      )}

      {/* Image Link */}
        {destination ? (
        <Link to={destination} className="pc-imgLink" aria-label={`Open ${p.title}`}>

          <div className="pc-img" style={{ backgroundImage: `url(${cover})` }} />
        </Link>
      ) : (
        <div className="pc-imgLink" aria-label={p.title}>
          <div className="pc-img" style={{ backgroundImage: `url(${cover})` }} />
        </div>
      )}

      {/* Body */}
      <div className="pc-body">
        <div className="pc-row">
           {propertyId ? (
            <Link
              to={`/property/${propertyId}`}
              style={{ textDecoration: "none", flex: 1, minWidth: 0 }}
            >
              <h3 className="pc-name text-truncate" title={p.title}>
                {p.title || "Untitled Property"}
              </h3>
            </Link>
          ) : (
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 className="pc-name text-truncate" title={p.title}>
                {p.title || "Untitled Property"}
              </h3>
            </div>
          )}
          <div className="pc-price">
            {displayPrice}
          </div>
        </div>

        <div className="pc-loc">
          <span className="material-symbols-outlined">location_on</span>
          <span className="text-truncate">
            {p.location || p.address || "—"}
          </span>
        </div>

        <div className="pc-meta">
          {(p.bedrooms ?? 0) > 0 && (
            <span className="pc-chip">
              <span className="material-symbols-outlined">bed</span> {p.bedrooms} Bed
            </span>
          )}
          {(p.bathrooms ?? 0) > 0 && (
            <span className="pc-chip">
              <span className="material-symbols-outlined">bathtub</span>{" "}
              {p.bathrooms} Bath
            </span>
          )}
          {areaVal && (
            <span className="pc-chip">
              <span className="material-symbols-outlined">straighten</span>{" "}
              {areaVal} m²
            </span>
          )}
        </div>

        {/* CTA Buttons */}
        {(onSchedule || onMessage) && (
          <div className="pc-cta">
            {onSchedule && (
              <button
                type="button"
                className="pc-ctaPrimary"
                onClick={(e) => {
                  e.preventDefault();
                  onSchedule();
                }}
              >
                Schedule Viewing
              </button>
            )}
            {onMessage && (
              <button
                type="button"
                className="pc-ctaSecondary"
                onClick={(e) => {
                  e.preventDefault();
                  onMessage();
                }}
              >
                Message Agent
              </button>
            )}
          </div>
        )}

        {/* Remove Link */}
        {showRemoveLink && onRemove && (
          <button
            type="button"
            className="pc-removeLink"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
          >
            <span className="material-symbols-outlined">heart_minus</span>
            Remove from Favorites
          </button>
        )}
      </div>
    </div>
  );
}

