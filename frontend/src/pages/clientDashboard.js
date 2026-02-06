// src/pages/clientDashboard.js
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Container, Row, Col, Card, Badge } from "react-bootstrap";
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
          const img =
            (p.images?.[0] && normalizeUploadPath(p.images[0])) ||
            "https://via.placeholder.com/600x360?text=No+Image";

          const isFav = favorites.includes(p._id);
          const match = matchLabel(p);

          return (
            <Col md={6} lg={4} key={p._id}>
              <Card className="h-100 shadow-sm border-0 position-relative">
                {/* Match pill (optional) */}
                {match && (
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      zIndex: 5,
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: "var(--primary)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 800,
                      boxShadow: "0 10px 18px rgba(0,0,0,.12)",
                    }}
                  >
                    {match}
                  </div>
                )}

                {/* ❤️ Heart favorite (top-right) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFavorite(p._id);
                  }}
                  aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                  title={isFav ? "Remove from favorites" : "Add to favorites"}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 6,
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,.10)",
                    background: "rgba(255,255,255,.92)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <span
                  className={`material-symbols-outlined fav-heart ${isFav ? "active" : ""}`}
                >
                  favorite
                </span>

                </button>

                <Link
                  to={`/property/${p._id}`}
                  className="text-decoration-none text-dark"
                  aria-label={`Open ${p.title}`}
                >
                  <div
                  className="cd-img"
                  style={{ backgroundImage: `url(${img})` }}
                />

                  <Card.Body>
                    <Card.Title className="mb-1">{p.title}</Card.Title>
                    <div className="text-muted small">📍 {p.location}</div>

                    <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                      {p.rent != null && (
                        <Badge bg="light" text="dark">
                          💶 {currency(p.rent)} €
                        </Badge>
                      )}
                      {p.type && (
                        <Badge
                          bg="primary"
                          title="Type"
                          style={{
                            background:
                              "linear-gradient(135deg,#4b0082,#e0b0ff)",
                          }}
                        >
                          {p.type}
                        </Badge>
                      )}
                      {(p.bedrooms ?? 0) > 0 && (
                        <Badge bg="light" text="dark" title="Bedrooms">
                          🛏 {p.bedrooms}
                        </Badge>
                      )}
                      {(p.bathrooms ?? 0) > 0 && (
                        <Badge bg="light" text="dark" title="Bathrooms">
                          🛁 {p.bathrooms}
                        </Badge>
                      )}
                    </div>
                  </Card.Body>
                </Link>

                <Card.Footer className="bg-white border-0 d-flex justify-content-between">
                  <Link
                    to={`/property/${p._id}`}
                    className="btn btn-sm btn-outline-primary rounded-pill"
                  >
                    View
                  </Link>

                  {/* κρατάμε δεξιά κενό (ή βάλε κάτι άλλο στο μέλλον) */}
                  <div />
                </Card.Footer>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
}
