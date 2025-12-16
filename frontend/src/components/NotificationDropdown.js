import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

/** helpers (βάλε τα δικά σου αν τα έχεις ήδη global) */
const iconForType = (t) => {
  switch (t) {
    case "appointment": return "📅";
    case "favorite": return "⭐";
    case "property_removed": return "🏠❌";
    case "message": return "💬";
    default: return "🔔";
  }
};
const titleForNote = (n) => {
  if (n?.message) return n.message;
  switch (n?.type) {
    case "favorite": return `${n?.senderId?.name || "Someone"} added your property to favorites.`;
    case "property_removed": return "A property you interacted with was removed.";
    case "message": return "New message received.";
    default: return "Notification";
  }
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
};

export default function NotificationsDropdown({
  token,
  onOpenAppointment, // (appointmentId) => void
  className = "",
}) {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !(n.readAt || n.read)).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list);
    } catch (e) {
      console.error("fetchNotifications failed", e);
      setNotifications([]);
    }
  }, [token]);

  // fetch on open + small polling while mounted (optional)
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // close on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (!open) return;
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // close on esc
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      // mark visible unread as read immediately (optimistic)
      const unread = notifications.filter((n) => !(n.readAt || n.read));
      if (unread.length) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) =>
            unread.some((u) => u._id === n._id) ? { ...n, read: true, readAt: now } : n
          )
        );
        try {
          await Promise.all(
            unread.map((n) =>
              api.patch(`/notifications/${n._id}/read`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              })
            )
          );
        } catch (e) {
          // revert if needed
          console.error("mark unread read failed", e);
          fetchNotifications();
        }
      }
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !(n.readAt || n.read));
    if (!unread.length) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: now })));
    try {
      await Promise.all(
        unread.map((n) =>
          api.patch(`/notifications/${n._id}/read`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
        )
      );
    } catch (e) {
      console.error("markAllRead failed", e);
      fetchNotifications();
    }
  };

  // dedupe like you did
  const deduped = useMemo(() => {
    const seen = new Set();
    return notifications.filter((n) => {
      const id = n._id || `${n.type}-${n.referenceId}-${n.createdAt || ""}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [notifications]);

  const onClickNote = async (note) => {
    if (!note) return;

    // optimistic mark single read
    const wasUnread = !(note.readAt || note.read);
    if (wasUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === note._id ? { ...n, read: true, readAt: new Date().toISOString() } : n))
      );
      try {
        await api.patch(`/notifications/${note._id}/read`, {}, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } catch {
        fetchNotifications();
      }
    }

    setOpen(false);

    if (note.type === "appointment" && note.referenceId) {
      onOpenAppointment?.(note.referenceId);
      return;
    }
    if (note.referenceId) {
      navigate(`/property/${note.referenceId}`);
    }
  };

  return (
    <div ref={rootRef} className={`nd-root ${className}`}>
      <button
        type="button"
        className="nd-bellBtn"
        onClick={toggle}
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined">notifications</span>

        {unreadCount > 0 && (
          <span className="nd-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="nd-pop">
          <div className="nd-card">
            <div className="nd-head">
              <div className="nd-headTitle">Notifications</div>

              <div className="nd-actions">
                {unreadCount > 0 && (
                  <button type="button" className="nd-ghostBtn" onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
                <button type="button" className="nd-xBtn" onClick={() => setOpen(false)} aria-label="Close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="nd-list">
              {deduped.length === 0 ? (
                <div className="nd-empty">No notifications</div>
              ) : (
                deduped.map((note) => {
                  const isUnread = !(note.readAt || note.read);
                  return (
                    <button
                      key={note._id || `${note.type}-${note.referenceId}-${note.createdAt}`}
                      type="button"
                      className={`nd-item ${isUnread ? "unread" : ""}`}
                      onClick={() => onClickNote(note)}
                    >
                      <div className="nd-ic">{iconForType(note.type)}</div>

                      <div className="nd-body">
                        <div className="nd-row">
                          <div className="nd-text">{titleForNote(note)}</div>
                          {isUnread && <span className="nd-dot" aria-label="unread" />}
                        </div>
                        <div className="nd-time">{timeAgo(note.createdAt)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="nd-foot">
              <button
                type="button"
                className="nd-linkBtn"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
              >
                View all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
