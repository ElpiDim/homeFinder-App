// src/pages/Properties.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Αν έχεις φτιάξει http instance όπως προτείναμε:
import http from "../api/http";
// Αν έχεις ήδη άλλο axios instance σε ../api, άλλαξε το import:
// import api from "../api";

import { useAuth } from "../context/AuthContext";

const pageGradient = {
  minHeight: "100vh",
  background:
    "linear-gradient(135deg, #006400 0%, #228b22 33%, #32cd32 66%, #90ee90 100%)",
};

const API_PUBLIC_BASE = process.env.REACT_APP_FILES_BASE || "http://localhost:5000";

const imgUrl = (src) =>
  src
    ? src.startsWith("http")
      ? src
      : `${API_PUBLIC_BASE}${src}`
    : "https://via.placeholder.com/400x200?text=No+Image";

export default function Properties() {
  const { user } = useAuth(); // { role, ... } ή null
  const [properties, setProperties] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setErrMsg("");
      try {
        // αν υπάρχει token, ο interceptor θα το βάλει (optional auth)
        const res = await http.get("/properties", {
          params: q ? { q } : undefined,
        });
        if (!cancelled) setProperties(res.data);
      } catch (err) {
        if (!cancelled) {
          // Δεν κάνουμε redirect σε login – είναι public σελίδα
          console.error("Error fetching properties:", err);
          setErrMsg("Σφάλμα φόρτωσης ακινήτων. Δοκίμασε ξανά.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div style={pageGradient}>
      <div className="container py-5">
        <div className="d-flex align-items-center gap-3 mb-3">
          <h2 className="fw-bold m-0">Available Properties</h2>

          {/* Αν ο χρήστης είναι tenant, ο server ήδη φιλτράρει → δείξε badge */}
          {user?.role === "client" && (
            <span className="badge text-bg-success">Eligible results</span>
          )}
        </div>

        <div className="mb-4">
          <input
            className="form-control form-control-lg"
            placeholder="Αναζήτηση (τίτλος/τοποθεσία/διεύθυνση)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {loading && <p className="text-muted">Φόρτωση…</p>}
        {errMsg && <p className="text-danger">{errMsg}</p>}

        {!loading && !errMsg && properties.length === 0 && (
          <p className="text-muted">No properties found.</p>
        )}

        {!loading && !errMsg && properties.length > 0 && (
          <div className="row g-4">
            {properties.map((prop) => (
              <div className="col-md-4" key={prop._id}>
                <div className="card border-0 shadow-sm h-100">
                  <div
                    className="rounded-top"
                    style={{
                      backgroundImage: `url(${imgUrl(prop.images?.[0])})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      height: "200px",
                    }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-semibold">{prop.title}</h5>
                    <p className="text-muted mb-1">📍 {prop.location}</p>
                    {prop.price != null && (
                      <p className="text-muted mb-1">
                        💶 {Number(prop.price).toLocaleString()} €
                      </p>
                    )}
                    {prop.type && (
                      <p className="text-muted mb-3">🏷️ {prop.type}</p>
                    )}
                    <div className="mt-auto">
                      <Link
                        to={`/property/${prop._id}`}
                        className="btn btn-primary rounded-pill px-4"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
