import React, { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import ClientNavLayout from "../components/ClientNavLayout";
import "./Appointments.css";

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_ORIGIN =
    (process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
      : "") || (typeof window !== "undefined" ? window.location.origin : "");

  const normalizeUploadPath = (src) => {
    if (!src) return "";
    if (src.startsWith("http")) return src;
    const clean = src.replace(/^\/+/, "");
    return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
  };

  const imgUrl = (
    src,
    fallback = "https://placehold.co/640x420?text=No+Image"
  ) => {
    if (!src) return fallback;
    if (src.startsWith("http")) return src;
    return `${API_ORIGIN}${normalizeUploadPath(src)}`;
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);

        const endpoint =
          user?.role === "owner" ? "/appointments/owner" : "/appointments/tenant";

        const res = await api.get(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const confirmed = (res.data || [])
          .filter((a) => a.status === "confirmed" && a.selectedSlot)
          .sort((a, b) => new Date(a.selectedSlot) - new Date(b.selectedSlot));

        setAppointments(confirmed);
      } catch (e) {
        console.error("fetch appointments error", e);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAppointments();
  }, [user, token]);

  // Fix: μην βάζεις Date.now() σαν dependency, αλλά κράτα το "now" σταθερό για το render-session
  const now = useMemo(() => Date.now(), [appointments.length]);

  const upcoming = useMemo(
    () => appointments.filter((a) => new Date(a.selectedSlot).getTime() >= now),
    [appointments, now]
  );

  const nextUp = upcoming[0] || null;
  const restUpcoming = nextUp ? upcoming.slice(1) : upcoming;

  const totalViewings = appointments.length;
  const upcomingCount = upcoming.length;

  // Lead person info (best-effort από next appointment)
  const leadPerson = useMemo(() => {
    if (!nextUp) return null;
    if (user?.role === "owner") return nextUp.tenantId || null;
    return nextUp.ownerId || null;
  }, [nextUp, user?.role]);

  const leadName =
    leadPerson?.name || (user?.role === "owner" ? "Your Tenant" : "Your Lead Agent");
  const leadRole = user?.role === "owner" ? "Upcoming Tenant" : "Your Lead Agent";
  const leadAvatar = imgUrl(leadPerson?.profilePicture, "/default-avatar.jpg");

  const monthLabel = useMemo(() => {
    const d = nextUp?.selectedSlot ? new Date(nextUp.selectedSlot) : new Date();
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [nextUp]);

  const formatDay = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { day: "2-digit" });

  const formatMonthShort = (iso) =>
    new Date(iso)
      .toLocaleDateString("en-US", { month: "short" })
      .toUpperCase();

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="af-page">
        <div className="af-wrap">Loading…</div>
      </div>
    );
  }

  return (
    <ClientNavLayout
      title="Your Appointments"
      subtitle="Track your property viewings and manage appointments"
      headerActions={
        <button className="af-pillBtn" onClick={() => navigate("/dashboard")}>
          ↩ Back
        </button>
      }
    >
      <div className="af-page">
        <div className="af-wrap">
          <div className="af-grid">
            {/* LEFT COLUMN */}
            <aside className="af-left">
              <div className="af-card af-agent">
                <div className="af-agentRow">
                  <img className="af-agentAvatar" src={leadAvatar} alt="agent" />
                  <div>
                    <div className="af-agentName">{leadName}</div>
                    <div className="af-agentSub">{leadRole}</div>
                  </div>
                </div>

                <div className="af-agentActions">
                  {nextUp?.propertyId?._id && leadPerson?._id ? (
                    <button
                      className="af-miniBtn"
                      onClick={() =>
                        navigate(`/chat/${nextUp.propertyId._id}/${leadPerson._id}`)
                      }
                    >
                      Message
                    </button>
                  ) : (
                    <button className="af-miniBtn" disabled>
                      Message
                    </button>
                  )}

                  <button className="af-miniBtn ghost" disabled>
                    Call
                  </button>
                </div>
              </div>

              <div className="af-stats">
                <div className="af-card af-stat">
                  <div className="af-statIcon">👁️</div>
                  <div>
                    <div className="af-statVal">{totalViewings}</div>
                    <div className="af-statLbl">Total viewings</div>
                  </div>
                </div>
                <div className="af-card af-stat">
                  <div className="af-statIcon">📅</div>
                  <div>
                    <div className="af-statVal">{upcomingCount}</div>
                    <div className="af-statLbl">Upcoming</div>
                  </div>
                </div>
              </div>

              {/* Month label card (NO calendar) */}
              <div className="af-card af-month">
                <div className="af-monthTitle">{monthLabel}</div>
                <div className="af-monthSub">Scheduled appointments</div>
              </div>
            </aside>

            {/* MAIN COLUMN */}
            <main className="af-main">
              {/* Tabs row (UI only) */}
              <div className="af-tabsRow">
                <button className="af-tab active" type="button">
                  Timeline View
                </button>
                <button className="af-tab" type="button" disabled>
                  Calendar View
                </button>
                <button className="af-tab" type="button" disabled>
                  Past Viewings
                </button>
                <div className="af-tabsSpacer" />
                <button className="af-filter" type="button" disabled>
                  <span className="material-symbols-outlined">tune</span>
                  Filter
                </button>
              </div>

              {/* Timeline */}
              {!nextUp && restUpcoming.length === 0 ? (
                <div className="af-empty">No scheduled appointments.</div>
              ) : (
                <div className="af-timeline">
                  {nextUp && (
                    <TimelineItem
                      appt={nextUp}
                      isNext
                      formatDay={formatDay}
                      formatMonthShort={formatMonthShort}
                      formatTime={formatTime}
                      imgUrl={imgUrl}
                      user={user}
                    />
                  )}

                  {restUpcoming.map((a) => (
                    <TimelineItem
                      key={a._id}
                      appt={a}
                      formatDay={formatDay}
                      formatMonthShort={formatMonthShort}
                      formatTime={formatTime}
                      imgUrl={imgUrl}
                      user={user}
                    />
                  ))}
                </div>
              )}
            </main>
          </div> {/* ✅ af-grid close */}
        </div>   {/* af-wrap */}
      </div>     {/* af-page */}
    </ClientNavLayout>
  );
}

function TimelineItem({
  appt,
  isNext,
  formatDay,
  formatMonthShort,
  formatTime,
  imgUrl,
  user,
}) {
  const navigate = useNavigate();
  const p = appt.propertyId || {};
  const slot = appt.selectedSlot;

  const otherUserId =
    user?.role === "owner" ? appt.tenantId?._id : appt.ownerId?._id;

  const otherName =
    user?.role === "owner" ? appt.tenantId?.name : appt.ownerId?.name;

  const image = p?.images?.[0]
    ? imgUrl(p.images[0])
    : "https://placehold.co/640x420?text=No+Image";

  return (
    <div className={`af-item ${isNext ? "next" : ""}`}>
      {/* left date rail */}
      <div className="af-dateRail">
        <div className="af-day">{formatDay(slot)}</div>
        <div className="af-mon">{formatMonthShort(slot)}</div>
      </div>

      {/* timeline dot + line */}
      <div className="af-rail">
        <div className={`af-dot ${isNext ? "active" : ""}`} />
        <div className="af-line" />
      </div>

      {/* card */}
      <div className="af-card af-apptCard">
        {isNext && <div className="af-nextPill">NEXT UP</div>}

        <div className="af-apptTop">
          <div className="af-timeTag">
            <span className="material-symbols-outlined">schedule</span>
            {formatTime(slot)}
          </div>

          <div className="af-status confirmed">Confirmed</div>
        </div>

        <div className="af-apptGrid">
          <div className="af-apptImg">
            <img src={image} alt={p.title || "Property"} />
          </div>

          <div className="af-apptBody">
            <div className="af-apptTitle">{p.title || "Property"}</div>

            <div className="af-apptAddr">
              <span className="material-symbols-outlined">location_on</span>
              {p.address || p.location || "—"}
            </div>

            <div className="af-agentMini">
              <img
                src={imgUrl(
                  user?.role === "owner"
                    ? appt.tenantId?.profilePicture
                    : appt.ownerId?.profilePicture,
                  "/default-avatar.jpg"
                )}
                alt="person"
              />
              <div>
                <div className="af-agentMiniName">{otherName || "—"}</div>
                <div className="af-agentMiniSub">Meeting you there</div>
              </div>
            </div>

            <div className="af-apptActions">
              {p?._id && (
                <Link className="af-btn primary" to={`/property/${p._id}`}>
                  View Details
                </Link>
              )}

              {p?._id && otherUserId && (
                <button
                  className="af-btn"
                  type="button"
                  onClick={() => navigate(`/chat/${p._id}/${otherUserId}`)}
                >
                  Message
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
