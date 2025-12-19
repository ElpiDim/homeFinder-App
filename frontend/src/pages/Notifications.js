// src/pages/Notifications.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import AppointmentModal from "../components/AppointmentModal";
import Logo from "../components/Logo";
import "./Notifications.css";

/* ---------- helpers ---------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, "") : "") ||
  (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
}

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;

  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

const iconForType = (t) => {
  switch ((t || "").toLowerCase()) {
    case "appointment":
      return { icon: "event", cls: "np-ic np-ic-green" };
    case "favorite":
      return { icon: "home", cls: "np-ic np-ic-purple" }; // matches/likes
    case "message":
      return { icon: "mail", cls: "np-ic np-ic-gray" };
    case "property_removed":
      return { icon: "warning", cls: "np-ic np-ic-red" };
    default:
      return { icon: "notifications", cls: "np-ic np-ic-purple" };
  }
};

const titleForNote = (n) => {
  if (n?.title) return n.title;
  if (n?.message && typeof n.message === "string") {
    // αν είναι μεγάλο, θα το δείξουμε ως description και κρατάμε απλό title
    return (n.type || "Notification").replace(/_/g, " ");
  }
  switch ((n?.type || "").toLowerCase()) {
    case "favorite":
      return "New Match";
    case "appointment":
      return "Upcoming Viewing Reminder";
    case "message":
      return "New Message";
    case "property_removed":
      return "Listing Update";
    default:
      return "Notification";
  }
};

const descForNote = (n) => {
  if (n?.message) return n.message;
  switch ((n?.type || "").toLowerCase()) {
    case "favorite": {
      const name = n?.senderId?.name || "Someone";
      return `${name} added your property to favorites.`;
    }
    case "appointment":
      return "You have an appointment scheduled.";
    case "message":
      return "You received a new message.";
    case "property_removed":
      return "A property you interacted with was removed.";
    default:
      return "Notification";
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { unreadChats } = useMessages();

  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // all | unread | appointments | matches
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith("http")
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : "/default-avatar.jpg";

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      // de-dup για safety
      const seen = new Set();
      const unique = list.filter((n) => {
        const key = n._id || `${n.type}-${n.referenceId}-${n.createdAt || ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(unique);
    } catch (e) {
      console.error("Fetch notifications failed", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read && !n.readAt).length,
    [items]
  );

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read && !n.readAt);
    if (!unread.length) return;
    try {
      await Promise.all(
        unread.map((n) =>
          api.patch(
            `/notifications/${n._id}/read`,
            {},
            { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
          )
        )
      );
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => ({ ...n, read: true, readAt: n.readAt || now })));
    } catch (e) {
      console.error("Mark all read failed", e);
    }
  }, [items, token]);

  const markSingleRead = useCallback(
    async (noteId) => {
      try {
        await api.patch(
          `/notifications/${noteId}/read`,
          {},
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );
        const now = new Date().toISOString();
        setItems((prev) => prev.map((n) => (n._id === noteId ? { ...n, read: true, readAt: now } : n)));
      } catch {
        // no-op
      }
    },
    [token]
  );

  const filtered = useMemo(() => {
    const base = items.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    switch (activeTab) {
      case "unread":
        return base.filter((n) => !n.read && !n.readAt);
      case "appointments":
        return base.filter((n) => (n.type || "").toLowerCase() === "appointment");
      case "matches":
        // “Matches” = favorites / match notifications
        return base.filter((n) => ["favorite", "match", "matches"].includes((n.type || "").toLowerCase()));
      default:
        return base;
    }
  }, [items, activeTab]);

  const groups = useMemo(() => {
    const today = dayStart(new Date()).getTime();
    const yesterday = dayStart(new Date(Date.now() - 86400000)).getTime();

    const g = { today: [], yesterday: [], older: [] };
    for (const n of filtered) {
      const d0 = dayStart(new Date(n.createdAt || Date.now())).getTime();
      if (d0 === today) g.today.push(n);
      else if (d0 === yesterday) g.yesterday.push(n);
      else g.older.push(n);
    }
    return g;
  }, [filtered]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleOpenNotification = async (note) => {
    const isUnread = !note.read && !note.readAt;
    if (isUnread) {
      // optimistic update
      setItems((prev) => prev.map((n) => (n._id === note._id ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
      markSingleRead(note._id);
    }

    if ((note.type || "").toLowerCase() === "appointment" && note.referenceId) {
      setSelectedAppointmentId(note.referenceId);
      return;
    }
    if (note.referenceId) {
      navigate(`/property/${note.referenceId}`);
    }
  };

  const Sidebar = () => {
    // κρατάμε “client-like” sidebar όπως στο screenshot
    return (
      <aside className="np-aside">
        <div className="np-brand">
          <div className="np-logo">
            <Logo as="h5" className="mb-0 logo-in-nav" />
          </div>
          <div className="np-brandMeta">
            <div className="np-brandTitle">{user?.role === "owner" ? "Owner Portal" : "Client Portal"}</div>
            <div className="np-brandSub">Manage your journey</div>
          </div>
        </div>

        <nav className="np-nav">
          <Link className="np-link" to="/dashboard">
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </Link>

          {user?.role !== "owner" && (
            <Link className="np-link" to="/favorites">
              <span className="material-symbols-outlined">favorite</span>
              <span>Favorites</span>
            </Link>
          )}

          <Link className="np-link" to="/appointments">
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Appointments</span>
          </Link>

          <Link className="np-link np-link-active" to="/notifications">
            <span className="material-symbols-outlined">notifications</span>
            <span>Notifications</span>
            {unreadCount > 0 && <span className="np-badge">{unreadCount}</span>}
          </Link>

          <Link className="np-link" to="/profile">
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>

          <Link className="np-link" to="/messages">
            <span className="material-symbols-outlined">chat</span>
            <span>Messages</span>
            {unreadChats > 0 && <span className="np-badge">{unreadChats}</span>}
          </Link>
        </nav>

        <div className="np-asideBottom">
          <div className="np-userRow">
            <img className="np-avatar" src={profileImg} alt="profile" />
            <div className="np-userMeta">
              <div className="np-userName">{user?.name || "User"}</div>
              <div className="np-userRole">{user?.role === "owner" ? "Property Owner" : "Client"}</div>
            </div>
          </div>

          <button className="np-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
    );
  };

  const Pill = ({ id, icon, label, count, active, onClick }) => (
    <button
      type="button"
      className={`np-pill ${active ? "np-pill-active" : ""}`}
      onClick={onClick}
    >
      {icon && <span className="material-symbols-outlined">{icon}</span>}
      <span>{label}</span>
      {typeof count === "number" && count > 0 && <span className="np-pillCount">{count}</span>}
    </button>
  );

  const Section = ({ title, children }) => (
    <div className="np-section">
      <div className="np-sectionTitle">{title}</div>
      <div className="np-list">{children}</div>
    </div>
  );

  const Card = ({ note }) => {
    const unread = !note.read && !note.readAt;
    const { icon, cls } = iconForType(note.type);

    // Actions σε “στυλ screenshot”
    const primaryActionLabel =
      (note.type || "").toLowerCase() === "appointment"
        ? "Confirm"
        : (note.type || "").toLowerCase() === "message"
          ? "Reply"
          : "View";

    const secondaryActionLabel =
      (note.type || "").toLowerCase() === "appointment" ? "Reschedule" : null;

    return (
      <div className={`np-card ${unread ? "np-card-unread" : ""}`}>
        <div className="np-cardLeft">
          <div className={cls}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        </div>

        <div className="np-cardBody" onClick={() => handleOpenNotification(note)} role="button" tabIndex={0}>
          <div className="np-cardTop">
            <div className="np-cardTitleRow">
              <div className="np-cardTitle">
                {titleForNote(note)} {unread && <span className="np-dot" />}
              </div>
              <div className="np-cardTime">{timeAgo(note.createdAt)}</div>
            </div>
            <div className="np-cardDesc">{descForNote(note)}</div>
          </div>
        </div>

        <div className="np-cardActions">
          {secondaryActionLabel && (
            <button
              type="button"
              className="np-btn np-btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenNotification(note);
              }}
            >
              {secondaryActionLabel}
            </button>
          )}

          <button
            type="button"
            className="np-btn np-btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenNotification(note);
            }}
          >
            {primaryActionLabel}
          </button>

          <button
            type="button"
            className="np-btn np-btn-icon"
            aria-label="more"
            onClick={(e) => {
              e.stopPropagation();
              // optional: εδώ μπορείς να ανοίξεις menu (delete etc.)
            }}
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="np-shell">
      <div className="np-layout">
        <Sidebar />

        <main className="np-main">
          <header className="np-topbar">
            <div className="np-head">
              <div className="np-h1">Notifications</div>
              <div className="np-h2">Stay updated with your latest matches and alerts</div>

              <div className="np-pills">
                <Pill
                  id="all"
                  icon="done_all"
                  label="All"
                  active={activeTab === "all"}
                  onClick={() => setActiveTab("all")}
                />
                <Pill
                  id="unread"
                  icon="mark_email_unread"
                  label="Unread"
                  count={unreadCount}
                  active={activeTab === "unread"}
                  onClick={() => setActiveTab("unread")}
                />
                <Pill
                  id="appointments"
                  icon="event"
                  label="Appointments"
                  active={activeTab === "appointments"}
                  onClick={() => setActiveTab("appointments")}
                />
                <Pill
                  id="matches"
                  icon="home"
                  label="Matches"
                  active={activeTab === "matches"}
                  onClick={() => setActiveTab("matches")}
                />
              </div>
            </div>

            <button
              type="button"
              className="np-markAll"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <span className="material-symbols-outlined">done_all</span>
              Mark all as read
            </button>
          </header>

          <div className="np-content">
            {loading ? (
              <div className="np-empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="np-empty">No notifications.</div>
            ) : (
              <>
                {groups.today.length > 0 && (
                  <Section title="TODAY">
                    {groups.today.map((n) => <Card key={n._id} note={n} />)}
                  </Section>
                )}
                {groups.yesterday.length > 0 && (
                  <Section title="YESTERDAY">
                    {groups.yesterday.map((n) => <Card key={n._id} note={n} />)}
                  </Section>
                )}
                {groups.older.length > 0 && (
                  <Section title="OLDER">
                    {groups.older.map((n) => <Card key={n._id} note={n} />)}
                  </Section>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </div>
  );
}
