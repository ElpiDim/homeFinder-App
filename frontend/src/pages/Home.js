// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import GoogleMapView from "../components/GoogleMapView";

function Home() {
  const [properties, setProperties] = useState([]);
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // 1) Προαιρετικά: γεωτοποθεσία χρήστη
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

  // 2) Featured με sort=relevance
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
      } catch (err) {
        console.error("Failed to load featured properties:", err);
        setProperties([]);
      }
    };
    fetchFeatured();
  }, [userLat, userLng]);

  const pageGradient = {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)",
  };

  const imgUrl = (src) =>
    src
      ? src.startsWith("http")
        ? src
        : `http://localhost:5000${src}`
      : "https://via.placeholder.com/400x200?text=No+Image";

  return (
    <div style={pageGradient}>
      {/* Header */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 5000,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <span role="img" aria-label="home">🏠</span>
          <h5
            className="mb-0"
            style={{
              fontFamily: "'Poppins','Fredoka',sans-serif",
              fontWeight: 600,
              textTransform: "lowercase",
              background: "linear-gradient(90deg,#2563eb,#9333ea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            homie
          </h5>
        </div>

        <div className="ms-auto d-flex align-items-center gap-2 gap-sm-3">
          {/* Login: λευκό κουμπί με gradient hover */}
          <Link
            to="/login"
            className="btn rounded-pill px-3 px-sm-4 fw-semibold"
            style={{
              background: "#fff",
              color: "#111827",
              border: "1px solid #e5e7eb",
              transition: "all .25s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, #2563eb, #9333ea)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.border = "none";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#111827";
              e.currentTarget.style.border = "1px solid #e5e7eb";
            }}
          >
            Login
          </Link>

          {/* Register: γεμάτο gradient */}
          <Link
            to="/register"
            className="btn rounded-pill px-3 px-sm-4 fw-semibold"
            style={{
              background: "linear-gradient(135deg,#2563eb,#9333ea)",
              color: "#fff",
              border: "none",
              boxShadow: "0 6px 18px rgba(37,99,235,.28)",
            }}
          >
            Register
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center py-5 d-flex flex-column justify-content-center align-items-center">
        <div className="container">
          <h1
            className="mb-2"
            style={{
              fontFamily: "'Poppins','Fredoka',sans-serif",
              fontSize: "3rem",
              fontWeight: 600,
              textTransform: "lowercase",
              letterSpacing: "0.5px",
            }}
          >
            <span
              style={{
                background: "linear-gradient(90deg, #2563eb, #9333ea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              homie
            </span>
          </h1>

          <p className="lead mb-0">Find a house, make it your home in a click.</p>
        </div>
      </section>

      {/* Map */}
      <div className="container my-5">
        <div
          className="card border-0 shadow-sm rounded-4"
          style={{ overflow: "hidden" }}
        >
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
                <Link
                  to={`/property/${prop._id}`}
                  className="text-decoration-none text-dark"
                >
                  <div className="card border-0 shadow-sm h-100 rounded-4">
                    <div
                      className="rounded-top"
                      style={{
                        backgroundImage: `url(${imgUrl(prop.images?.[0])})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        height: "200px",
                        borderTopLeftRadius: "1rem",
                        borderTopRightRadius: "1rem",
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
                      {prop.type && (
                        <p className="card-text text-muted">🏷️ {prop.type}</p>
                      )}
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
