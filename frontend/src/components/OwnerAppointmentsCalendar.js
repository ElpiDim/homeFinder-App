// src/components/OwnerAppointmentsCalendar.jsx
import React, { useEffect, useMemo, useState } from "react";
import AppointmentModal from "./AppointmentModal";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayStart = (date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

function OwnerAppointmentsCalendar({ appointments = [] }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // open details via modal when clicking a day
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);

  const confirmedAppointments = useMemo(() => {
    return appointments
      .map((appt) => {
        const slot = appt?.selectedSlot || appt?.slot || appt?.date;
        if (!slot) return null;
        const when = new Date(slot);
        if (Number.isNaN(when.getTime())) return null;
        return { ...appt, date: when };
      })
      .filter(Boolean)
      .filter((appt) => (appt.status || "").toLowerCase() === "confirmed");
  }, [appointments]);

  const pendingCount = useMemo(
    () => appointments.filter((appt) => (appt.status || "").toLowerCase() !== "confirmed").length,
    [appointments]
  );

  const calendar = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = (startOfMonth.getDay() + 6) % 7; // Monday-first offset

    const appointmentsByDay = {};
    confirmedAppointments.forEach((appt) => {
      if (appt.date.getFullYear() !== year || appt.date.getMonth() !== month) return;
      const day = appt.date.getDate();
      if (!appointmentsByDay[day]) appointmentsByDay[day] = [];
      appointmentsByDay[day].push(appt);
    });

    for (const day of Object.keys(appointmentsByDay)) {
      appointmentsByDay[day].sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    const cells = [];
    for (let i = 0; i < leadingEmpty; i += 1) cells.push(null);

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, appointments: appointmentsByDay[day] || [] });
    }

    while (cells.length % 7 !== 0) cells.push(null);

    return { cells, appointmentsByDay };
  }, [currentMonth, confirmedAppointments]);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const today = useMemo(() => dayStart(new Date()), []);

  const upcoming = useMemo(() => {
    const filtered = confirmedAppointments
      .filter((appt) => dayStart(appt.date).getTime() >= today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    return filtered.slice(0, 4);
  }, [confirmedAppointments, today]);

  const goPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const isCurrentMonth = (date) => {
    if (!date) return false;
    return (
      date.getFullYear() === currentMonth.getFullYear() &&
      date.getMonth() === currentMonth.getMonth()
    );
  };

  const handleDayClick = (dayAppointments) => {
    if (!dayAppointments || dayAppointments.length === 0) return;
    setSelectedAppointmentId(dayAppointments[0]._id);
  };

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const exists = confirmedAppointments.some((appt) => appt._id === selectedAppointmentId);
    if (!exists) setSelectedAppointmentId(null);
  }, [confirmedAppointments, selectedAppointmentId]);

  const closeModal = () => setSelectedAppointmentId(null);

  // ====== STYLE TOKENS (premium + consistent) ======
  const baseBg = "#ffffff";
  const baseBorder = "#e5e7eb";
  const mutedText = "#6b7280";

  const apptBg = "rgba(127, 19, 236, 0.10)";
  const apptBorder = "rgba(127, 19, 236, 0.28)";

  // mov–fouks (πιο έντονο από primary)
  const todayBorder = "#d100ff"; // fuchsia-violet
  const todayRing = "0 0 0 3px rgba(209, 0, 255, 0.12)";

  return (
    <div
      className="p-4 rounded-4 shadow-sm"
      style={{ background: "#ffffffcc", border: "1px solid #eef2f4" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill px-3"
          onClick={goPreviousMonth}
        >
          ‹
        </button>
        <div className="fw-semibold">{monthFormatter.format(currentMonth)}</div>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill px-3"
          onClick={goNextMonth}
        >
          ›
        </button>
      </div>

      <div
        className="d-grid"
        style={{
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: "8px",
          fontSize: "0.8rem",
        }}
      >
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="text-center fw-semibold text-uppercase"
            style={{ fontSize: "0.72rem", color: mutedText, letterSpacing: "0.06em" }}
          >
            {weekday}
          </div>
        ))}

        {calendar.cells.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 1" }} />;

          const { day, appointments: dayAppointments } = cell;
          const hasAppointments = dayAppointments.length > 0;
          const isToday = today.getDate() === day && isCurrentMonth(today);

          const bg = hasAppointments ? apptBg : baseBg;
          const borderColor = isToday ? todayBorder : hasAppointments ? apptBorder : baseBorder;
          const boxShadow = isToday ? todayRing : "none";

          return (
            <button
              type="button"
              key={`day-${day}`}
              className="rounded-3 border text-start"
              onClick={() => handleDayClick(dayAppointments)}
              style={{
                aspectRatio: "1 / 1",
                padding: "10px",
                background: bg,
                borderWidth: 2,
                borderColor,
                boxShadow,
                cursor: hasAppointments ? "pointer" : "default",
                transition: "transform 130ms ease, border-color 130ms ease, box-shadow 130ms ease",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "flex-start",
              }}
              onMouseEnter={(e) => {
                if (!hasAppointments) return;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.borderColor = "rgba(127, 19, 236, 0.55)";
                e.currentTarget.style.boxShadow = isToday
                  ? todayRing
                  : "0 8px 18px rgba(17, 24, 39, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = borderColor;
                e.currentTarget.style.boxShadow = boxShadow;
              }}
              aria-label={hasAppointments ? `Open appointments for day ${day}` : `Day ${day}`}
            >
              <span
                className="fw-semibold"
                style={{
                  fontSize: "0.9rem",
                  color: isToday ? "#111827" : "#111827",
                }}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <h6 className="fw-semibold mb-2" style={{ fontSize: "0.9rem" }}>
          Upcoming appointments
        </h6>

        {upcoming.length === 0 ? (
          <p className="mb-0" style={{ fontSize: "0.85rem", color: mutedText }}>
            No confirmed appointments on the calendar yet.
          </p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {upcoming.map((appt) => {
              const title = appt.propertyId?.title || "Property viewing";
              const tenant = appt.tenantId?.name || "Tenant";
              const when = timeFormatter.format(appt.date);

              return (
                <button
                  key={`upcoming-${appt._id}`}
                  type="button"
                  className="w-100 text-start border rounded-3 p-2"
                  style={{
                    background: "#fff",
                    borderColor: "#e5e7eb",
                    fontSize: "0.85rem",
                    transition: "transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.borderColor = "rgba(127, 19, 236, 0.35)";
                    e.currentTarget.style.boxShadow = "0 8px 18px rgba(17, 24, 39, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onClick={() => setSelectedAppointmentId(appt._id)}
                >
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="fw-semibold">{title}</div>
                    <span style={{ color: "#7f13ec", fontWeight: 600 }}>View</span>
                  </div>

                  <div style={{ fontSize: "0.82rem", color: mutedText }}>
                    {when} • {tenant}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div
          className="alert alert-warning mt-3 mb-0 py-2 px-3"
          style={{
            fontSize: "0.8rem",
            background: "#fef3c7",
            borderColor: "#fde68a",
            color: "#92400e",
          }}
        >
          You have {pendingCount} appointment{pendingCount > 1 ? "s" : ""} waiting for confirmation.
        </div>
      )}

      {selectedAppointmentId && (
        <AppointmentModal appointmentId={selectedAppointmentId} onClose={closeModal} />
      )}
    </div>
  );
}

export default OwnerAppointmentsCalendar;
