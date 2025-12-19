import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import OwnerAppointmentsCalendar from "../components/OwnerAppointmentsCalendar";
import Logo from "../components/Logo";
import "./OwnerDashboard.css";
import NotificationDropdown from "../components/NotificationDropdown";


export default function OwnerDashboard() {
  const { user, logout, token  } = useAuth();
  const { unreadChats } = useMessages();
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
    () => allProperties.filter(p => (p.status || "").toLowerCase() === "rented").length,
    [allProperties]
  );
  const likedListings = useMemo(
    () => allProperties.filter(p => Number(p.favoritesCount || 0) > 0).length,
    [allProperties]
  );
  const totalViews = useMemo(
    () => allProperties.reduce((sum, p) => sum + (p.seenBy ? p.seenBy.length : 0), 0),
    [allProperties]
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const profileImg = user?.profilePicture || "/default-avatar.jpg";

  return (
    <div className="owner-shell">
      <div className="owner-layout">
        {/* ================= SIDEBAR ================= */}
        <aside className="owner-aside">
          <div className="d-flex align-items-center gap-2 px-2 py-3">
            <div style={{ color: "var(--primary)" }}>
              <Logo as="h5" className="mb-0 logo-in-nav" />
            </div>
          </div>

          <div
            className="d-flex flex-column justify-content-between"
            style={{ height: "calc(100vh - 90px)" }}
          >
            <div className="d-flex flex-column gap-1 pt-2">
              <Link className="owner-navlink active" to="/dashboard">
                <span className="material-symbols-outlined fill">dashboard</span>
                <span className="small">Dashboard</span>
              </Link>

              <Link className="owner-navlink" to="/calendar">
                <span className="material-symbols-outlined">calendar_month</span>
                <span className="small">Calendar</span>
              </Link>

              <Link className="owner-navlink position-relative" to="/messages">
                <span className="material-symbols-outlined">chat</span>
                <span className="small">Messages</span>
                {unreadChats > 0 && (
                  <span className="badge bg-danger ms-auto">{unreadChats}</span>
                )}
              </Link>

              <Link className="owner-navlink" to="/settings">
                <span className="material-symbols-outlined">settings</span>
                <span className="small">Settings</span>
              </Link>

            </div>

            <div className="d-flex flex-column gap-3">
              <Link
                to="/add-property"
                className="btn w-100 text-white fw-bold"
                style={{ background: "var(--primary)", borderRadius: 12, height: 40 }}
              >
                Add New Property
              </Link>

              <Link to="/profile" className="text-decoration-none">
                <div className="d-flex align-items-center gap-3">
                  <img
                    src={profileImg}
                    alt="profile"
                    className="rounded-circle"
                    style={{ width: 40, height: 40, objectFit: "cover" }}
                  />
                  <div>
                    <div className="fw-semibold" style={{ color: "var(--text)" }}>
                      {user?.name || "Owner"}
                    </div>
                    <div className="small" style={{ color: "var(--text2)" }}>
                      Property Owner
                    </div>
                  </div>
                </div>
              </Link>

              <button
                className="btn btn-outline-secondary w-100"
                onClick={handleLogout}
                style={{ borderRadius: 12, height: 40 }}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* ================= MAIN ================= */}
        <main className="owner-main">
          {/* TOPBAR */}
          <header className="owner-topbar d-flex align-items-center justify-content-between">
            <h5 className="mb-0 fw-bold">Dashboard</h5>

            <div className="d-flex align-items-center gap-2">
              <NotificationDropdown token={token} className="od-iconWrap" />

              <button className="owner-iconbtn" type="button" aria-label="help">
                <span className="material-symbols-outlined">help</span>
              </button>
            </div>

                      </header>

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
                  <h4 className="fw-bold mb-3">My Properties</h4>

                  <div className="d-flex flex-column gap-3">
                    {allProperties.slice(0, 5).map((p) => (
                      <div key={p._id} className="owner-card p-3">
                        <div className="row g-3 align-items-center">
                          <div className="col-12 col-md-3">
                            <div
                              className="rounded-3"
                              style={{
                                height: 120,
                                background: "#eee",
                                backgroundImage: p.images?.[0]
                                  ? `url(${p.images[0]})`
                                  : "none",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            />
                          </div>

                          <div className="col-12 col-md-5 text-center text-md-start">
                            <div className="fw-bold">
                              {p.title || p.address || "Property"}
                            </div>
                            <div className="small" style={{ color: "var(--text2)" }}>
                              {p.city || p.location || ""}
                            </div>
                          </div>

                          <div className="col-12 col-md-2 d-flex justify-content-center justify-content-md-start">
                            <span
                              className={[
                                "owner-pill",
                                (p.status || "").toLowerCase() === "rented"
                                  ? "owner-pill-rented"
                                  : (p.status || "").toLowerCase() === "sale"
                                  ? "owner-pill-sale"
                                  : "owner-pill-vacant",
                              ].join(" ")}
                            >
                              {p.status || "Vacant"}
                            </span>
                          </div>

                          <div className="col-12 col-md-2 d-flex justify-content-center justify-content-md-end">
                            <button
                              className="btn fw-bold"
                              style={{
                                background: "rgba(127,19,236,0.10)",
                                color: "var(--primary)",
                                borderRadius: 10,
                              }}
                              onClick={() => navigate(`/property/${p._id}`)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="col-12 col-lg-4">
                <div className="owner-card p-3">
                  <h4 className="fw-bold px-2 pt-2 mb-2">
                    Upcoming Appointments
                  </h4>
                  <OwnerAppointmentsCalendar appointments={ownerAppointments} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
