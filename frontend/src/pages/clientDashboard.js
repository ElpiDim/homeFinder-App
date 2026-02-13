// src/pages/clientDashboard.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Container, Row, Col, Badge } from "react-bootstrap";
import PropertyCard from "../components/propertyCard";
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
  const rel = clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  return `${API_ORIGIN}${rel}`;
}

const currency = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : n ?? "";

export default function ClientDashboard() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [allProperties, setAllProperties] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const preferredDealType = useMemo(() => {
    if (user?.role !== "client") return undefined;
    return user?.preferences?.dealType === "sale" ? "sale" : "rent";
  }, [user]);

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

  useEffect(() => {
    if (!socket || user?.role !== "client") return;

    const refreshMatchesOnListingChange = (note) => {
      const type = (note?.type || "").toLowerCase();
      if (type === "property_status" || type === "property_removed") {
        fetchMatches();
        fetchFavorites();
      }
    };

    socket.on("notification", refreshMatchesOnListingChange);
    return () => {
      socket.off("notification", refreshMatchesOnListingChange);
    };
  }, [socket, user?.role, fetchMatches, fetchFavorites]);

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

  const matchLabel = (p) => {
    const v =
      p?.matchPercent ??
      p?.matchPercentage ??
      p?.relevancePercent ??
      p?.scorePercent ??
      null;
    if (typeof v === "number" && Number.isFinite(v)) {
      return `${Math.round(v)}% MATCH`;
    }
    return null;
  };

  if (allProperties.length === 0) {
    return <div className="cd-empty">No matched properties yet.</div>;
  }

  return (
    <Container className="py-2">
      <Row className="g-4">
        {allProperties.map((p) => {
          const isFav = favorites.includes(p._id);
          const match = matchLabel(p);

          // Try to determine ownerId for messaging
          const ownerId = p.ownerId?._id || p.ownerId || p.userId?._id || p.userId || p.createdBy?._id || p.createdBy;

          return (
            <Col md={6} lg={4} key={p._id}>
              <PropertyCard
                property={p}
                matchLabel={match}
                isFavorite={isFav}
                onToggleFavorite={() => handleFavorite(p._id)}
                onSchedule={() => navigate("/appointments")}
                onMessage={ownerId ? () => navigate(`/chat/${p._id}/${ownerId}`) : undefined}
                showRemoveLink={false}
              />
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}
