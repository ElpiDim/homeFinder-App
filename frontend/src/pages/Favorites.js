// src/pages/Favorites.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFavorites, removeFavorite } from "../services/favoritesService";
import "./Favorites.css";

/* -------- helpers (images) -------- */
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

function getMatchLabel(p) {
  const v =
    p?.matchPercent ??
    p?.matchPercentage ??
    p?.relevancePercent ??
    p?.scorePercent ??
    null;
  if (typeof v === "number" && Number.isFinite(v)) return `${Math.round(v)}% MATCH`;
  return null;
}

function getOwnerIdFromProperty(p) {
  const cand =
    p?.ownerId?._id ||
    p?.ownerId ||
    p?.userId?._id ||
    p?.userId ||
    p?.createdBy?._id ||
    p?.createdBy ||
    null;

  return typeof cand === "string" ? cand : null;
}

/**
 * ✅ Best-effort: βρίσκουμε "ημερομηνία" για το newest/oldest
 * - αν έχεις createdAt στο property, θα πιάσει
 * - αλλιώς κοιτάει updatedAt
 * - αλλιώς createdAt από favorite record (αν υπάρχει μέσα στο propertyId object)
 */
function getPropertyDate(p) {
  const raw =
    p?.createdAt ||
    p?.updatedAt ||
    p?.date ||
    p?.timestamp ||
    null;

  const t = raw ? new Date(raw).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

export default function Favorites() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Tabs:
   * - all
   * - price
   * - highestMatch
   * - newestMatch
   */
  const [activeTab, setActiveTab] = useState("all");

  /**
   * sortKey controls sorting
   */
  const [sortKey, setSortKey] = useState("recent"); // recent | priceAsc | priceDesc | matchDesc | newestMatch | oldestMatch

  /**
   * Remember last price state
   */
  const [priceSort, setPriceSort] = useState("priceAsc"); // priceAsc | priceDesc

  /**
   * ✅ Remember last newest/oldest state
   */
  const [matchTimeSort, setMatchTimeSort] = useState("newestMatch"); // newestMatch | oldestMatch

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getFavorites(token);
        if (!mounted) return;

        const list = Array.isArray(data) ? data.filter((f) => f?.propertyId) : [];
        setFavorites(list);
      } catch (e) {
        console.error("Error fetching favorites:", e);
        if (mounted) setFavorites([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleRemoveFavorite = async (propertyId) => {
    try {
      await removeFavorite(propertyId, token);
      setFavorites((prev) => prev.filter((f) => f.propertyId?._id !== propertyId));
    } catch (e) {
      console.error("Error removing favorite:", e);
      alert("Failed to remove from favorites.");
    }
  };

  const properties = useMemo(
    () => favorites.map((f) => f.propertyId).filter(Boolean),
    [favorites]
  );

  const visible = useMemo(() => {
    const arr = properties.slice();

    if (sortKey === "priceAsc") arr.sort((a, b) => (a?.rent ?? 0) - (b?.rent ?? 0));
    if (sortKey === "priceDesc") arr.sort((a, b) => (b?.rent ?? 0) - (a?.rent ?? 0));
    if (sortKey === "matchDesc") arr.sort((a, b) => (b?.matchPercent ?? 0) - (a?.matchPercent ?? 0));

    // ✅ newest/oldest match (by date)
    if (sortKey === "newestMatch") arr.sort((a, b) => getPropertyDate(b) - getPropertyDate(a));
    if (sortKey === "oldestMatch") arr.sort((a, b) => getPropertyDate(a) - getPropertyDate(b));

    return arr;
  }, [properties, sortKey]);

  return (
    <div className="fav-page">
      <div className="fav-top fav-top--compact">
        <div className="fav-subtitle">
          You have <b>{loading ? "…" : visible.length}</b> properties saved in your list
        </div>
      </div>

      {/* ✅ Underlined tabs */}
      <div className="fav-tabsRow">
        {/* All */}
        <button
          type="button"
          className={`fav-tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("all");
            setSortKey("recent");
            // keep priceSort + matchTimeSort as-is
          }}
        >
          All Favorites
        </button>

        {/* Price toggle */}
        <button
          type="button"
          className={`fav-tab ${activeTab === "price" ? "active" : ""}`}
          onClick={() => {
            if (activeTab === "price") {
              const next = priceSort === "priceAsc" ? "priceDesc" : "priceAsc";
              setPriceSort(next);
              setSortKey(next);
              return;
            }
            setActiveTab("price");
            setSortKey(priceSort);
          }}
        >
          {priceSort === "priceDesc" ? "Price: High to Low" : "Price: Low to High"}
        </button>

        {/* Highest match */}
        <button
          type="button"
          className={`fav-tab ${activeTab === "highestMatch" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("highestMatch");
            setSortKey("matchDesc");
          }}
        >
          Highest Match
        </button>

        {/* ✅ Newest/Oldest match toggle */}
        <button
          type="button"
          className={`fav-tab ${activeTab === "newestMatch" ? "active" : ""}`}
          onClick={() => {
            // if already here -> toggle
            if (activeTab === "newestMatch") {
              const next = matchTimeSort === "newestMatch" ? "oldestMatch" : "newestMatch";
              setMatchTimeSort(next);
              setSortKey(next);
              return;
            }
            // coming from other tab -> activate using last remembered state
            setActiveTab("newestMatch");
            setSortKey(matchTimeSort);
          }}
        >
          {matchTimeSort === "oldestMatch" ? "Oldest Match" : "Newest Match"}
        </button>
      </div>

      {loading ? (
        <div className="fav-empty">Loading your favorites…</div>
      ) : visible.length === 0 ? (
        <div className="fav-empty">
          <div className="fav-emptyIcon">♡</div>
          <div className="fav-emptyTitle">No favorites yet</div>
          <div className="fav-emptySub">Tap the heart on any property to save it here.</div>
          <button className="fav-primaryBtn" onClick={() => navigate("/dashboard")}>
            Browse Properties
          </button>
        </div>
      ) : (
        <div className="fav-grid">
          {visible.map((p) => {
            const img =
              (p.images?.[0] && normalizeUploadPath(p.images[0])) ||
              "https://via.placeholder.com/900x560?text=No+Image";

            const match = getMatchLabel(p);
            const ownerId = getOwnerIdFromProperty(p);

            return (
              <div key={p._id} className="fav-card">
                {match && <div className="fav-match">{match}</div>}

                <button
                  type="button"
                  className="fav-heart is-on"
                  onClick={() => handleRemoveFavorite(p._id)}
                  aria-label="Remove from favorites"
                  title="Remove from favorites"
                >
                  <span className="material-symbols-outlined">favorite</span>
                </button>

                <Link to={`/property/${p._id}`} className="fav-imgLink" aria-label={`Open ${p.title}`}>
                  <div className="fav-img" style={{ backgroundImage: `url(${img})` }} />
                </Link>

                <div className="fav-body">
                  <div className="fav-row">
                    <div className="fav-name">{p.title || "Property"}</div>
                    <div className="fav-price">{p.rent != null ? `€${currency(p.rent)}` : ""}</div>
                  </div>

                  <div className="fav-loc">
                    <span className="material-symbols-outlined">location_on</span>
                    {p.location || p.address || "—"}
                  </div>

                  <div className="fav-meta">
                    {(p.bedrooms ?? 0) > 0 && (
                      <span className="fav-chip">
                        <span className="material-symbols-outlined">bed</span> {p.bedrooms} Bed
                      </span>
                    )}
                    {(p.bathrooms ?? 0) > 0 && (
                      <span className="fav-chip">
                        <span className="material-symbols-outlined">bathtub</span> {p.bathrooms} Bath
                      </span>
                    )}
                    {(p.area ?? p.sqft) && (
                      <span className="fav-chip">
                        <span className="material-symbols-outlined">straighten</span>{" "}
                        {p.area ?? p.sqft} sqft
                      </span>
                    )}
                  </div>

                  <div className="fav-cta">
                    <button
                      type="button"
                      className="fav-ctaPrimary"
                      onClick={() => navigate("/appointments")}
                      title="Schedule viewing"
                    >
                      Schedule Viewing
                    </button>

                    <button
                      type="button"
                      className="fav-ctaSecondary"
                      onClick={() => {
                        if (p?._id && ownerId) navigate(`/chat/${p._id}/${ownerId}`);
                        else navigate("/messages");
                      }}
                      title="Message agent"
                    >
                      Message Agent
                    </button>
                  </div>

                  <button
                    type="button"
                    className="fav-removeLink"
                    onClick={() => handleRemoveFavorite(p._id)}
                  >
                    <span className="material-symbols-outlined">heart_minus</span>
                    Remove from Favorites
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
