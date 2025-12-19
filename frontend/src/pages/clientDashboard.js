// src/pages/clientDashboard.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import PropertyCard from "../components/propertyCard";
import ClientNavLayout from "../components/ClientNavLayout";
import "./clientDashboard.css";

/* ---------- images (local/ngrok) ---------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "") || (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
}

export default function ClientDashboard() {
  const { user } = useAuth();
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
        // ✅ FIXED: spread prev correctly
        setFavorites((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error("Error updating favorite:", err);
    }
  };

  // optional: if backend returns match score
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
    <ClientNavLayout
      title="Your Matched Properties"
      subtitle="Properties selected based on your preferences."
    >
      {allProperties.length === 0 ? (
        <div className="cd-empty">No matched properties yet.</div>
      ) : (
        <div className="cd-grid">
          {allProperties.map((prop) => (
            <div key={prop._id} className="cd-cardWrap">
              {matchLabel(prop) && <div className="cd-matchPill">{matchLabel(prop)}</div>}

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
    </ClientNavLayout>
  );
}
