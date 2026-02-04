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

  // ✅ now we open details via modal when clicking a day dot
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
    () =>
      appointments.filter(
        (appt) => (appt.status || "").toLowerCase() !== "confirmed"
      ).length,
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
      if (appt.date.getFullYear() !== year || appt.date.getMonth() !== month)
        return;
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

  // ✅ click day: open details (if multiple on same day, open the first; you can later add list modal)
  const handleDayClick = (dayAppointments) => {
    if (!dayAppointments || dayAppointments.length === 0) return;
    setSelectedAppointmentId(dayAppointments[0]._id);
  };

  // if selected appointment disappears, clear
  useEffect(() => {
    if (!selectedAppointmentId) return;
    const exists = confirmedAppointments.some((appt) => appt._id === selectedAppointmentId);
    if (!exists) setSelectedAppointmentId(null);
  }, [confirmedAppointments, selectedAppointmentId]);

  const closeModal = () => setSelectedAppointmentId(null);

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
        <div className="fw-semibold text-capitalize">{monthFormatter.format(currentMonth)}</div>
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
          gap: "6px",
          fontSize: "0.8rem",
        }}
      >
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="text-center fw-semibold text-muted text-uppercase"
            style={{ fontSize: "0.75rem" }}
          >
            {weekday}
          </div>
        ))}

        {calendar.cells.map((cell, idx) => {
          if (!cell) return <div key={`empty-${idx}`} style={{ aspectRatio: "1 / 1" }} />;

          const { day, appointments: dayAppointments } = cell;
          const hasAppointments = dayAppointments.length > 0;
          const isToday = today.getDate() === day && isCurrentMonth(today);

          return (
            <button
              type="button"
              key={`day-${day}`}
              className="rounded-3 border position-relative text-start"
              onClick={() => handleDayClick(dayAppointments)}
              style={{
                aspectRatio: "1 / 1",
                padding: "8px",
                background: hasAppointments ? "rgba(127,19,236,0.10)" : "#f9fafb",
                borderColor: isToday ? "#7f13ec" : "#e5e7eb",
                cursor: hasAppointments ? "pointer" : "default",
              }}
              aria-label={hasAppointments ? `Open appointments for day ${day}` : `Day ${day}`}
            >
              <div className="d-flex justify-content-between align-items-start">
                <span className="fw-semibold" style={{ fontSize: "0.85rem" }}>
                  {day}
                </span>
                {isToday && (
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.6rem",
                      background: "#7f13ec",
                      color: "#fff",
                    }}
                  >
                    Today
                  </span>
                )}
              </div>

              {/* ✅ DOT ONLY */}
              {hasAppointments && (
                <div
                  className="position-absolute"
                  style={{
                    left: "50%",
                    bottom: 10,
                    transform: "translateX(-50%)",
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "#7f13ec",
                  }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
  <h6 className="fw-semibold mb-2" style={{ fontSize: "0.9rem" }}>
    Upcoming appointments
  </h6>

  {upcoming.length === 0 ? (
    <p className="text-muted mb-0" style={{ fontSize: "0.85rem" }}>
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
            }}
            onClick={() => setSelectedAppointmentId(appt._id)} // opens details
          >
            <div className="d-flex justify-content-between align-items-start">
              <div className="fw-semibold">{title}</div>
              <span style={{ color: "#7f13ec", fontWeight: 600 }}>View</span>
            </div>

            <div className="text-muted" style={{ fontSize: "0.82rem" }}>
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

      {/* ✅ Details modal */}
      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => closeModal()}
        />
      )}
    </div>
  );
}

export default OwnerAppointmentsCalendar;
