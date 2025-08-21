// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import GoogleMapView from "../components/GoogleMapView";
import Logo from "../components/Logo";

function Home() {
  const [properties, setProperties] = useState([]);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

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
      : "https://via.placeholder.com/400x200?text=No+Image";

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
            limit: 24
          }
        });
        const items = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
        setProperties(items);
      } catch {
        setProperties([]);
      }
    };
    fetchFeatured();
  }, [userLat, userLng]);

  return (
    <div className="page-white">
      {/* Header (white, compact) */}
      <nav
        className="navbar navbar-expand-lg px-3 compact-nav shadow-sm bg-white border-bottom border-soft"
        style={{ position: "sticky", top: 0, zIndex: 5000 }}
>
        <div className="d-flex align-items-center gap-2">
          <span role="img" aria-label="home">🏠</span>
          {/* Gradient logo (ΔΕΝ βάζουμε logo-white) */}
          <Logo as="h5" className="mb-0" />
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
      <section className="hero-compact text-center d-flex flex-column justify-content-center align-items-center bg-white">
        <div className="container">
          {/* Gradient logo στο hero */}
          <Logo />
          <p className="lead mb-0">Find a house, make it your home in a click.</p>
        </div>
      </section>

      {/* Map */}
      <div className="container my-4">
        <div className="card border-0 shadow-sm rounded-4" style={{ overflow: "hidden" }}>
          <GoogleMapView
            properties={Array.isArray(properties) ? properties : []}
            height="320px"
            navigateOnMarkerClick
          />
        </div>
      </div>

      {/* Featured Properties */}
      <div className="container pb-5">
        <h4 className="fw-bold mb-3">Featured Properties</h4>
        <div className="row g-4">
          {!Array.isArray(properties) || properties.length === 0 ? (
            <p className="text-muted">No featured properties yet.</p>
          ) : (
            properties.map((prop) => (
              <div className="col-md-4" key={prop._id}>
                <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
                  <div className="card border-0 shadow-sm h-100 rounded-4">
                    <div
                      className="rounded-top"
                      style={{
                        backgroundImage: `url(${imgUrl(prop.images?.[0])})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        height: "200px",
                        borderTopLeftRadius: "1rem",
                        borderTopRightRadius: "1rem"
                      }}
                    />
                    <div className="card-body">
                      <h5 className="card-title">{prop.title}</h5>
                      <p className="card-text text-muted mb-0">📍 {prop.location}</p>
                      {prop.price != null && (
                        <p className="card-text text-muted mb-0">
                          💶 {Number(prop.price).toLocaleString()} €
                        </p>
                      )}
                      {prop.type && <p className="card-text text-muted">🏷️ {prop.type}</p>}
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
