import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import PropertyCard from "../components/propertyCard";
import Logo from "../components/Logo";
import NotificationDropdown from "../components/NotificationDropdown";
import "./clientDashboard.css";

/* ---------- images (local/ngrok) ---------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, "") : "") ||
  (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
}

export default function ClientDashboard() {
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();
  const navigate = useNavigate();

  const [allProperties, setAllProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const preferredDealType = useMemo(() => {
    if (user?.role !== "client") return undefined;
    return user?.preferences?.dealType === "sale" ? "sale" : "rent";
  }, [user]);

  const imgUrl = useCallback((src) => {
    if (!src) return "https://via.placeholder.com/400x225?text=No+Image";
    if (src.startsWith("http")) return src;
    const rel = normalizeUploadPath(src);
    return `${API_ORIGIN}${rel}`;
  }, []);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.get("/properties", {
        params: {
          sort: "relevance",
          type: preferredDealType || undefined,
          page: 1,
          limit: 9999,
        },
      });
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setAllProperties(items);
    } catch (e) {
      console.error("fetchMatches failed", e);
      setAllProperties([]);
    }
  }, [preferredDealType]);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await api.get("/favorites");
      const arr = Array.isArray(res.data) ? res.data : [];
      const ids = arr
        .map((fav) => {
          const pid =
            fav.propertyId && typeof fav.propertyId === "object"
              ? fav.propertyId._id
              : fav.propertyId;
          return pid || null;
        })
        .filter(Boolean);
      setFavorites(ids);
    } catch {
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMatches();
    fetchFavorites();
  }, [user, fetchMatches, fetchFavorites]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await api.delete(`/favorites/${propertyId}`);
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await api.post(
          "/favorites",
          { propertyId },
          { headers: { "Content-Type": "application/json" } }
        );
        setFavorites((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error("Error updating favorite:", err);
    }
  };

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith("http")
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : "/default-avatar.jpg";

  // optional: αν έχεις match score από backend (π.χ. matchPercent / relevanceScore)
  const matchLabel = (p) => {
    const v =
      p?.matchPercent ??
      p?.matchPercentage ??
      p?.relevancePercent ??
      p?.scorePercent ??
      null;
    if (typeof v === "number" && Number.isFinite(v)) return `${Math.round(v)}% MATCH`;
    return null;
  };

  return (
    <div className="cd-shell">
      <div className="cd-layout">
        {/* SIDEBAR */}
        <aside className="cd-aside">
          <div className="cd-brand">
            <div style={{ color: "var(--primary)" }}>
              <Logo as="h5" className="mb-0 logo-in-nav" />
            </div>
          </div>

          <nav className="cd-nav">
            <Link className="cd-navlink active" to="/dashboard">
              <span className="material-symbols-outlined fill">home</span>
              <span>My Matches</span>
            </Link>

            <Link className="cd-navlink" to="/favorites">
              <span className="material-symbols-outlined">favorite</span>
              <span>Favorites</span>
            </Link>

            <Link className="cd-navlink" to="/appointments">
              <span className="material-symbols-outlined">calendar_month</span>
              <span>Appointments</span>
            </Link>

            <Link className="cd-navlink" to="/profile">
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </Link>

            <Link className="cd-navlink position-relative" to="/messages">
              <span className="material-symbols-outlined">chat</span>
              <span>Messages</span>
              {unreadChats > 0 && (
                <span className="badge bg-danger ms-auto">{unreadChats}</span>
              )}
            </Link>
          </nav>

          <div className="cd-profile">
            <Link to="/profile" className="text-decoration-none">
              <div className="cd-profileRow">
                <img className="cd-avatar" src={profileImg} alt="profile" />
                <div className="cd-profileMeta">
                  <div className="cd-name">{user?.name || "Client"}</div>
                  <div className="cd-role">Client</div>
                </div>
              </div>
            </Link>

            <button className="btn btn-outline-secondary w-100 mt-3" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="cd-main">
          <header className="cd-topbar">
            <div>
              <div className="cd-title">Your Matched Properties</div>
              <div className="cd-subtitle">
                Properties selected based on your preferences.
              </div>
            </div>

            {/* ✅ Notifications bell -> dropdown (new UI) */}
            <NotificationDropdown token={token} className="cd-iconWrap" />
          </header>

          <div className="cd-content">
            {allProperties.length === 0 ? (
              <div className="cd-empty">No matched properties yet.</div>
            ) : (
              <div className="cd-grid">
                {allProperties.map((prop) => (
                  <div key={prop._id} className="cd-cardWrap">
                    {matchLabel(prop) && (
                      <div className="cd-matchPill">{matchLabel(prop)}</div>
                    )}

                    <PropertyCard
                      prop={prop}
                      isFavorite={favorites.includes(prop._id)}
                      onToggleFavorite={() => handleFavorite(prop._id)}
                      imgUrl={imgUrl}
                      showFavorite={true}
                      onOpen={() => navigate(`/property/${prop._id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
