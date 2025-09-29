// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import GoogleMapView from "../components/GoogleMapView";
import Logo from "../components/Logo";
import PropertyCard from "../components/propertyCard";

function Home() {
  const [properties, setProperties] = useState([]);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const navigate = useNavigate();

  /* ---------- pastel page background (same as Dashboard) ---------- */
  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

  /* ---------- images (origin-safe) ---------- */
  const API_ORIGIN =
    (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, "") : "") ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const normalizeUploadPath = (src) => {
    if (!src) return "";
    if (src.startsWith("http")) return src;
    const clean = src.replace(/^\/+/, "");
    return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  };

  const imgUrl = (src) =>
    src
      ? src.startsWith("http")
        ? src
        : `${API_ORIGIN}${normalizeUploadPath(src)}`
      : "https://via.placeholder.com/400x225?text=No+Image";

  /* ---------- geolocation (optional) ---------- */
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
    );
  }, []);

  /* ---------- fetch featured ---------- */
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get("/properties", {
          params: {
            sort: "relevance",
            q: "",
            lat: userLat ?? undefined,
            lng: userLng ?? undefined,
            page: 1,
            limit: 24,
          },
        });
        const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setProperties(items);
      } catch {
        setProperties([]);
      }
    };
    fetchFeatured();
  }, [userLat, userLng]);

  const noop = () => {};

  return (
    <div style={pageGradient}>
      {/* Header (white, compact) */}
      <nav
        className="navbar navbar-expand-lg px-3 compact-nav shadow-sm bg-white border-bottom border-soft"
        style={{ position: "sticky", top: 0, zIndex: 5000 }}
      >
        <div className="d-flex align-items-center gap-2">
          {/* ίδιο logo με το Dashboard (gradient + μικρό μέγεθος) */}
          <Link to="/" className="text-decoration-none">
            <Logo as="h5" className="mb-0 logo-in-nav" />
          </Link>
        </div>

        <div className="ms-auto d-flex align-items-center gap-2 gap-sm-3">
          <Link to="/login" className="btn btn-brand-outline rounded-pill px-3 px-sm-4 fw-semibold">
            Login
          </Link>
          <Link to="/register" className="btn btn-brand rounded-pill px-3 px-sm-4 fw-semibold">
            Register
          </Link>
        </div>
      </nav>

      {/* Hero (compact) */}
      <section className="hero-compact text-center d-flex flex-column justify-content-center align-items-center">
        <div className="container">
          {/* Μεγάλο gradient logo + σκιές */}
          <Logo className="logo-shadow" />
          <p className="lead mb-0">Find a house, make it your home in a click.</p>
        </div>
      </section>

     
      {/* Featured Properties (ίδιες κάρτες με Dashboard) */}
      <div className="container pb-5">
        <h4 className="fw-bold mb-3">Featured Properties</h4>

        {!Array.isArray(properties) || properties.length === 0 ? (
          <p className="text-muted">No featured properties yet.</p>
        ) : (
          <div className="row g-3">
            {properties.map((prop) => (
              <div className="col-12 col-sm-6 col-lg-4" key={prop._id}>
                <PropertyCard
                  prop={prop}
                  isFavorite={false}
                  onToggleFavorite={noop}
                  imgUrl={imgUrl}
                  onOpen={() => navigate(`/property/${prop._id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
