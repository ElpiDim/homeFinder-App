import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import OwnerAppointmentsCalendar from "../components/OwnerAppointmentsCalendar";
import "./OwnerDashboard.css";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allProperties, setAllProperties] = useState([]);
  const [ownerAppointments, setOwnerAppointments] = useState([]);

  const fetchMine = useCallback(async () => {
    const res = await api.get("/properties/mine", { params: { includeStats: 1 } });
    const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
    setAllProperties(items);
  }, []);

  const fetchOwnerAppts = useCallback(async () => {
    const res = await api.get("/appointments/owner");
    setOwnerAppointments(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMine();
    fetchOwnerAppts();
  }, [user, fetchMine, fetchOwnerAppts]);

  /* ---------- stats ---------- */
  const totalListings = allProperties.length;
  const rentedListings = useMemo(
    () => allProperties.filter((p) => (p.status || "").toLowerCase() === "rented").length,
    [allProperties]
  );
  const likedListings = useMemo(
    () => allProperties.filter((p) => Number(p.favoritesCount || 0) > 0).length,
    [allProperties]
  );
  const totalViews = useMemo(
    () => allProperties.reduce((sum, p) => sum + (p.seenBy ? p.seenBy.length : 0), 0),
    [allProperties]
  );

  // --- helpers for cards (best-effort) ---
  const normalizeStatus = (status) => String(status || "").toLowerCase();
  const statusLabel = (p) => {
    const s = normalizeStatus(p.status);
    if (s === "rented" || s === "leased") return "Leased";
    if (s === "available") return "Available";
    if (s === "sale" || s === "for sale") return "For Sale";
    if (s) return String(p.status);
    return "AVAILABLE";
  };
  const statusClass = (p) => {
    const s = normalizeStatus(p.status);
    if (s === "rented" || s === "leased") return "od-tag leased";
    if (s === "sale" || s === "for sale") return "od-tag sale";
    return "od-tag available";
  };
  const formatPrice = (p) => {
    const price = p?.price;
    if (!price && price !== 0) return "";
    const n = typeof price === "number" ? price : Number(price);
    if (Number.isNaN(n)) return String(price);
    const base = `$${n.toLocaleString()}`;
    // best-effort /mo for rent
    const t = String(p?.type || "").toLowerCase();
    if (t === "rent") return `${base}/mo`;
    return base;
  };
  const safeMeta = (p) => {
    const beds = p?.bedrooms ?? p?.beds;
    const baths = p?.bathrooms ?? p?.baths;
    const sqft = p?.sqft ?? p?.area ?? p?.size;
    return { beds, baths, sqft };
  };

  return (
    <div className="owner-content">
      <div className="row g-4">
        {/* LEFT */}
        <div className="col-12 col-lg-8">
          {/* ===== STATS (3 ίδια γραμμή) ===== */}
          <div className="owner-stats-3">
            <div className="owner-card p-3">
              <div className="fw-medium" style={{ color: "var(--text2)" }}>
                Total Properties Rented
              </div>
              <div className="display-6 fw-bold mt-2">{rentedListings}</div>
              <div className="small" style={{ color: "var(--text2)" }}>
                out of {totalListings}
              </div>
            </div>

            <div className="owner-card p-3">
              <div className="fw-medium" style={{ color: "var(--text2)" }}>
                Total Views This Month
              </div>
              <div className="display-6 fw-bold mt-2">{totalViews}</div>
            </div>

            <div className="owner-card p-3">
              <div className="fw-medium" style={{ color: "var(--text2)" }}>
                Total Likes Received
              </div>
              <div className="display-6 fw-bold mt-2">{likedListings}</div>
            </div>
          </div>

          {/* ===== MY PROPERTIES ===== */}
          <div className="mt-4">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="fw-bold mb-0">My Properties</h4>
              <button
                type="button"
                className="od-viewAll"
                onClick={() => navigate("/properties")}
              >
                View All <span aria-hidden>→</span>
              </button>
            </div>

            {/* ✅ Only this area changed: now grid cards */}
            <div className="od-propGrid">
              {allProperties.slice(0, 6).map((p) => {
                const img = p.images?.[0] || "";
                const price = formatPrice(p);
                const title = p.title || p.address || "Property";
                const location = p.city || p.location || "";
                const { beds, baths, sqft } = safeMeta(p);

                return (
                  <div key={p._id} className="od-propCard owner-card">
                    <div
                      className="od-propMedia"
                      style={{ backgroundImage: `url(${img || ""})` }}
                    >
                      <div className={statusClass(p)}>{statusLabel(p)}</div>
                    </div>

                    <div className="p-3">
                      <div className="fw-bold">{title}</div>
                      <div className="small text-muted">{location}</div>

                      <div className="d-flex align-items-center gap-3 mt-2 small text-muted">
                        <span>{beds ? `${beds} Beds` : "— Beds"}</span>
                        <span>{baths ? `${baths} Baths` : "— Baths"}</span>
                        <span>{sqft ? `${sqft} sqft` : "— sqft"}</span>
                      </div>

                      <div className="mt-2 fw-semibold">{price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-12 col-lg-4">
          <div className="owner-card p-3 h-100">
            <h5 className="fw-bold mb-3">Upcoming Appointments</h5>
            {ownerAppointments.length === 0 ? (
              <div className="text-muted">No upcoming appointments.</div>
            ) : (
              <OwnerAppointmentsCalendar appointments={ownerAppointments} />
            )}
          </div>
        </div>
      </div>
    </div>
  );

}
