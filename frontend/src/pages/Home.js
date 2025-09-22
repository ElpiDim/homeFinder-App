// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import api from "../api";
import GoogleMapView from "../components/GoogleMapView";
import Logo from "../components/Logo";
import PropertyCard from "../components/propertyCard";

function Home() {
  const [properties, setProperties] = useState([]);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const navigate = useNavigate();

  /* ---------- hero decoration (animated gradient blob) ---------- */
  const heroAccent = useMemo(
    () => ({
      width: 120,
      height: 120,
      borderRadius: "50%",
      background:
        "radial-gradient(circle at 30% 30%, rgba(53,176,102,0.45), rgba(53,176,102,0))",
      filter: "blur(4px)",
      opacity: 0.65,
    }),
    []
  );

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
    <AppShell
      navRight={
        <div className="d-flex align-items-center gap-2 gap-sm-3 flex-wrap">
          <Link to="/login" className="btn btn-brand-outline">Login</Link>
          <Link to="/register" className="btn btn-brand">Get started</Link>
        </div>
      }
      hero={
        <div className="surface-section text-center position-relative overflow-hidden">
          <div className="position-absolute top-0 start-0 translate-middle" style={heroAccent} />
          <div className="position-absolute bottom-0 end-0 translate-middle" style={heroAccent} />

          <div className="d-flex flex-column align-items-center gap-3">
            <Logo className="logo-shadow" />
            <p className="lead text-muted-2 mb-1" style={{ maxWidth: 520 }}>
              Find the right home faster with curated listings, instant matches and a guided onboarding flow.
            </p>
            <div className="d-flex flex-column flex-sm-row gap-2 mt-2">
              <Link to="/register" className="btn btn-brand px-4">
                Browse smart matches
              </Link>
              <Link to="/onboarding" className="btn btn-brand-outline px-4">
                Continue onboarding
              </Link>
            </div>
          </div>
        </div>
      }
    >
      <section className="surface-card surface-card--glass">
        <div className="d-flex flex-column flex-md-row align-items-md-center gap-3 mb-3">
          <div>
            <h4 className="fw-bold mb-1">See homes near you</h4>
            <p className="text-muted mb-0">Interactive map with the latest listings matching your profile.</p>
          </div>
          <div className="ms-md-auto">
            <button type="button" className="btn btn-soft" onClick={() => navigate("/register")}>Create alert</button>
          </div>
        </div>
        <div className="rounded-4 overflow-hidden shadow-soft">
          <GoogleMapView
            properties={Array.isArray(properties) ? properties : []}
            height="320px"
            navigateOnMarkerClick
          />
        </div>
      </section>

      <section className="surface-card">
        <div className="d-flex flex-column flex-md-row align-items-md-center gap-3 mb-3">
          <div>
            <h4 className="fw-bold mb-1">Featured properties</h4>
            <p className="text-muted mb-0">Hand-picked homes from trusted partners across Greece.</p>
          </div>
          <div className="ms-md-auto">
            <Link to="/login" className="btn btn-brand-outline">Sign in to save favorites</Link>
          </div>
        </div>

        {!Array.isArray(properties) || properties.length === 0 ? (
          <div className="text-center text-muted py-5">No featured properties yet.</div>
        ) : (
          <div className="row g-4">
            {properties.map((prop) => (
              <div className="col-sm-6 col-lg-4" key={prop._id}>
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
      </section>
    </AppShell>
  );
}

export default Home;
