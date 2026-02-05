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
  // best-effort
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

export default function Favorites() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ Tabs: κρατάμε ξεχωριστό tab state
   * - all
   * - price
   * - highestMatch
   */
  const [activeTab, setActiveTab] = useState("all");

  /**
   * ✅ Το sorting που εφαρμόζεται στην λίστα
   */
  const [sortKey, setSortKey] = useState("recent"); // recent | priceAsc | priceDesc | matchDesc

  /**
   * ✅ Το “τελευταίο” price state (μένει όπως το άφησες ακόμη κι αν πας σε άλλο tab)
   */
  const [priceSort, setPriceSort] = useState("priceAsc"); // priceAsc | priceDesc

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
    let arr = properties.slice();

    // ✅ sort only (tabs control sortKey)
    if (sortKey === "priceAsc") arr.sort((a, b) => (a?.rent ?? 0) - (b?.rent ?? 0));
    if (sortKey === "priceDesc") arr.sort((a, b) => (b?.rent ?? 0) - (a?.rent ?? 0));
    if (sortKey === "matchDesc") arr.sort((a, b) => (b?.matchPercent ?? 0) - (a?.matchPercent ?? 0));

    return arr;
  }, [properties, sortKey]);

  return (
    <div className="fav-page">
      <div className="fav-top">
        <div>
          <div className="fav-title">My Favorites</div>
          <div className="fav-subtitle">
            You have <b>{loading ? "…" : visible.length}</b> properties saved in your list
          </div>
        </div>

        <div className="fav-actions">
          <button
            type="button"
            className="fav-actionBtn"
            onClick={() => {
              // placeholder (αν θες modal φίλτρων)
              setActiveTab("all");
              setSortKey("recent");
            }}
          >
            <span className="material-symbols-outlined">tune</span>
            Filter Properties
          </button>

          <button
            type="button"
            className="fav-actionBtn"
            onClick={() => {
              // placeholder sorting shortcut
              setActiveTab("all");
              setSortKey("recent");
            }}
            title="Recently added"
          >
            <span className="material-symbols-outlined">sort</span>
            Recently Added
          </button>
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
            // ⚠️ ΔΕΝ πειράζουμε το priceSort (μένει όπως το άφησες)
          }}
        >
          All Favorites
        </button>

        {/* Price toggle (remembers last state) */}
        <button
          type="button"
          className={`fav-tab ${activeTab === "price" ? "active" : ""}`}
          onClick={() => {
            // αν είμαστε ήδη στο price tab → toggle
            if (activeTab === "price") {
              const next = priceSort === "priceAsc" ? "priceDesc" : "priceAsc";
              setPriceSort(next);
              setSortKey(next);
              return;
            }

            // αν ερχόμαστε από άλλο tab → ενεργοποίησε price tab
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
            // ⚠️ ΔΕΝ πειράζουμε το priceSort
          }}
        >
          Highest Match
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

                {/* heart (favorites page -> always filled) */}
                <button
                  type="button"
                  className="fav-heart is-on"
                  onClick={() => handleRemoveFavorite(p._id)}
                  aria-label="Remove from favorites"
                  title="Remove from favorites"
                >
                  <span className="material-symbols-outlined">favorite</span>
                </button>

                <Link
                  to={`/property/${p._id}`}
                  className="fav-imgLink"
                  aria-label={`Open ${p.title}`}
                >
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
