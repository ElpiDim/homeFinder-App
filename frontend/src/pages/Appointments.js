// src/pages/Appointments.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./Appointments.css";

export default function Appointments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ view toggle (calendar only for clients)
  const [view, setView] = useState("timeline"); // "timeline" | "calendar"

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

  const imgUrl = (src, fallback = "https://placehold.co/640x420?text=No+Image") => {
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

  // keep "now" fresh (so upcoming updates)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const upcoming = useMemo(
    () => appointments.filter((a) => new Date(a.selectedSlot).getTime() >= now),
    [appointments, now]
  );

  const nextUp = upcoming[0] || null;
  const restUpcoming = nextUp ? upcoming.slice(1) : upcoming;

  const totalViewings = appointments.length;
  const upcomingCount = upcoming.length;

  const formatDay = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { day: "2-digit" });

  const formatMonthShort = (iso) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short" }).toUpperCase();

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const formatFullDateTime = (iso) =>
    new Date(iso).toLocaleString("en-US", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const onMessageFromAppointment = useCallback(
    (appt) => {
      const pid = appt?.propertyId?._id;
      const otherId = user?.role === "owner" ? appt?.tenantId?._id : appt?.ownerId?._id;
      if (pid && otherId) navigate(`/chat/${pid}/${otherId}`);
    },
    [navigate, user?.role]
  );

  // ✅ if role switches or owner opens page, keep timeline selected
  useEffect(() => {
    if (user?.role !== "client" && view === "calendar") setView("timeline");
  }, [user?.role, view]);

  if (loading) {
    return (
      <div className="af-page">
        <div className="af-wrap">Loading…</div>
      </div>
    );
  }

  return (
    <div className="af-page">
      <div className="af-wrap">
        <div className="af-grid">
          {/* LEFT COLUMN */}
          <aside className="af-left">
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

            {/* Next appointment card */}
            <div className="af-card af-month">
              <div className="af-monthSub" style={{ fontWeight: 800 }}>
                Next appointment:
              </div>

              <div className="af-monthTitle" style={{ fontWeight: 400 }}>
                {nextUp?.selectedSlot
                  ? formatFullDateTime(nextUp.selectedSlot)
                  : "No upcoming appointment"}
              </div>

              {nextUp?.propertyId?._id && (
                <div className="af-monthSub" style={{ marginTop: 10 }}>
                  <span style={{ fontWeight: 800, color: "rgba(0,0,0,.7)" }}>
                    {nextUp.propertyId.title || "Property"}
                  </span>
                  <div style={{ marginTop: 4 }}>
                    {nextUp.propertyId.address || nextUp.propertyId.location || "—"}
                  </div>
                </div>
              )}

              {nextUp && (
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {nextUp?.propertyId?._id && (
                    <Link className="af-btn primary" to={`/property/${nextUp.propertyId._id}`}>
                      View Details
                    </Link>
                  )}
                  <button
                    className="af-btn"
                    type="button"
                    onClick={() => onMessageFromAppointment(nextUp)}
                  >
                    Message
                  </button>
                </div>
              )}
            </div>

            {/* ✅ NOTES κάτω από το Next appointment */}
            <AppointmentNotes appointmentId={nextUp?._id} />
          </aside>

          {/* MAIN COLUMN */}
          <main className="af-main">
            {/* Tabs row */}
            <div className="af-tabsRow">
              <button
                className={`af-tab ${view === "timeline" ? "active" : ""}`}
                type="button"
                onClick={() => setView("timeline")}
              >
                Timeline View
              </button>

              {user?.role === "client" && (
                <button
                  className={`af-tab ${view === "calendar" ? "active" : ""}`}
                  type="button"
                  onClick={() => setView("calendar")}
                >
                  Calendar View
                </button>
              )}

              <div className="af-tabsSpacer" />

              <button className="af-filter" type="button" disabled>
                <span className="material-symbols-outlined">tune</span>
                Filter
              </button>
            </div>

            {/* CONTENT */}
            {user?.role === "client" && view === "calendar" ? (
              <ClientCalendarView
                appointments={appointments}
                onMessage={(appt) => onMessageFromAppointment(appt)}
              />
            ) : !nextUp && restUpcoming.length === 0 ? (
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
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ appt, isNext, formatDay, formatMonthShort, formatTime, imgUrl, user }) {
  const navigate = useNavigate();
  const p = appt.propertyId || {};
  const slot = appt.selectedSlot;

  const otherUserId = user?.role === "owner" ? appt.tenantId?._id : appt.ownerId?._id;
  const otherName = user?.role === "owner" ? appt.tenantId?.name : appt.ownerId?.name;

  const image = p?.images?.[0] ? imgUrl(p.images[0]) : "https://placehold.co/640x420?text=No+Image";

  return (
    <div className={`af-item ${isNext ? "next" : ""}`}>
      <div className="af-dateRail">
        <div className="af-day">{formatDay(slot)}</div>
        <div className="af-mon">{formatMonthShort(slot)}</div>
      </div>

      <div className="af-rail">
        <div className={`af-dot ${isNext ? "active" : ""}`} />
        <div className="af-line" />
      </div>

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
            <div className="af-apptTitle">{p.title || "Property viewing"}</div>

            <div className="af-apptAddr">
              <span className="material-symbols-outlined">location_on</span>
              {p.address || p.location || "—"}
            </div>

            <div className="af-agentMini">
              <img
                src={imgUrl(
                  user?.role === "owner" ? appt.tenantId?.profilePicture : appt.ownerId?.profilePicture,
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
                <button className="af-btn" type="button" onClick={() => navigate(`/chat/${p._id}/${otherUserId}`)}>
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

/* ----------------------- CLIENT CALENDAR VIEW ----------------------- */

function ClientCalendarView({ appointments = [], onMessage }) {
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [selectedDay, setSelectedDay] = useState(null); // day number
  const [selectedApptId, setSelectedApptId] = useState(null);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [currentMonth]);

  const apptsWithDate = useMemo(() => {
    return (appointments || [])
      .map((a) => {
        const when = a?.selectedSlot ? new Date(a.selectedSlot) : null;
        if (!when || Number.isNaN(when.getTime())) return null;
        return { ...a, __date: when };
      })
      .filter(Boolean);
  }, [appointments]);

  const apptsByDay = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const map = {};
    for (const a of apptsWithDate) {
      if (a.__date.getFullYear() !== y || a.__date.getMonth() !== m) continue;
      const d = a.__date.getDate();
      if (!map[d]) map[d] = [];
      map[d].push(a);
    }
    Object.keys(map).forEach((k) => map[k].sort((x, y) => x.__date - y.__date));
    return map;
  }, [apptsWithDate, currentMonth]);

  const cells = useMemo(() => {
    const y = currentMonth.getFullYear();
    const m = currentMonth.getMonth();
    const start = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const leadingEmpty = (start.getDay() + 6) % 7;

    const arr = [];
    for (let i = 0; i < leadingEmpty; i++) arr.push(null);
    for (let day = 1; day <= daysInMonth; day++) arr.push(day);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [currentMonth]);

  const selectedList = useMemo(() => {
    if (!selectedDay) return [];
    return apptsByDay[selectedDay] || [];
  }, [selectedDay, apptsByDay]);

  const selectedAppt = useMemo(() => {
    if (!selectedApptId) return null;
    return apptsWithDate.find((a) => a._id === selectedApptId) || null;
  }, [selectedApptId, apptsWithDate]);

  const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const goPrev = () => setCurrentMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  const goNext = () => setCurrentMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1));

  return (
    <div className="af-calWrap">
      <div className="af-calHead">
        <button type="button" className="af-calNav" onClick={goPrev}>
          ‹
        </button>
        <div className="af-calMonth">{monthLabel}</div>
        <button type="button" className="af-calNav" onClick={goNext}>
          ›
        </button>
      </div>

      <div className="af-calGrid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="af-calWeekday">
            {w}
          </div>
        ))}

        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} className="af-calCell empty" />;

          const list = apptsByDay[day] || [];
          const has = list.length > 0;
          const isSelected = selectedDay === day;

          return (
            <button
              key={`d-${day}`}
              type="button"
              className={`af-calCell ${has ? "has" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setSelectedDay(day);
                setSelectedApptId(null);
              }}
            >
              <div className="af-calDayNum">{day}</div>

              {has && (
                <div className="af-calEvents">
                  {list.slice(0, 2).map((a) => (
                    <button
                      key={a._id}
                      type="button"
                      className="af-calEvent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDay(day);
                        setSelectedApptId(a._id);
                      }}
                      title="Open appointment"
                    >
                      {fmtTime(a.__date)}
                    </button>
                  ))}

                  {list.length > 2 && <div className="af-calMore">+{list.length - 2} more</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="af-calInfo">
        {!selectedDay ? (
          <div className="af-calEmpty">Click a day to see appointments.</div>
        ) : selectedAppt ? (
          <div className="af-calDetail">
            <div className="af-calDetailTitle">
              {selectedAppt.propertyId?.title || "Property viewing"}
            </div>
            <div className="af-calDetailSub">
              {selectedAppt.__date.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="af-calDetailSub">
              With: {selectedAppt.ownerId?.name || "Owner"}
            </div>

            <div className="af-calDetailActions">
              {selectedAppt.propertyId?._id && (
                <Link className="af-btn primary" to={`/property/${selectedAppt.propertyId._id}`}>
                  View Details
                </Link>
              )}
              <button className="af-btn" type="button" onClick={() => onMessage?.(selectedAppt)}>
                Message
              </button>
            </div>
          </div>
        ) : (
          <div className="af-calList">
            <div className="af-calListTitle">Appointments on day {selectedDay}</div>

            {selectedList.length === 0 ? (
              <div className="af-calEmpty">No appointments.</div>
            ) : (
              <div className="af-calListItems">
                {selectedList.map((a) => (
                  <button
                    key={a._id}
                    type="button"
                    className="af-calListRow"
                    onClick={() => setSelectedApptId(a._id)}
                  >
                    <div className="af-calListTime">{fmtTime(a.__date)}</div>
                    <div className="af-calListMeta">
                      <div className="af-calListProp">{a.propertyId?.title || "Property viewing"}</div>
                      <div className="af-calListWith">With {a.ownerId?.name || "Owner"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------- NOTES (LEFT) ----------------------- */

function AppointmentNotes({ appointmentId }) {
  const storageKey = appointmentId ? `appt_notes_${appointmentId}` : "appt_notes_general";

  const [text, setText] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const save = (next) => {
    setItems(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const makeId = () => {
    try {
      if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    } catch {}
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const add = () => {
    const v = text.trim();
    if (!v) return;
    save([{ id: makeId(), text: v, done: false }, ...items]);
    setText("");
  };

  const toggle = (id) => {
    save(items.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const remove = (id) => {
    save(items.filter((x) => x.id !== id));
  };

  return (
    <div className="af-card af-notes">
      <div className="af-notesHead">
        <div className="af-notesTitle">Notes</div>
        <div className="af-notesSub">{appointmentId ? "For next appointment" : "General"}</div>
      </div>

      <div className="af-notesAdd">
        <textarea
          className="af-notesInput af-notesTextarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          rows={4}
          onKeyDown={(e) => {
            // Enter = νέα γραμμή, Ctrl/Cmd+Enter = Add
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") add();
          }}
        />

        <button className="af-notesBtn" type="button" onClick={add}>
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <div className="af-notesEmpty">No notes yet.</div>
      ) : (
        <div className="af-notesList">
          {items.map((n) => (
            <div key={n.id} className={`af-note ${n.done ? "done" : ""}`}>
              <button type="button" className="af-noteCheck" onClick={() => toggle(n.id)} aria-label="toggle">
                {n.done ? "✓" : ""}
              </button>

              <div className="af-noteText">{n.text}</div>

              <button type="button" className="af-noteX" onClick={() => remove(n.id)} aria-label="remove">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
