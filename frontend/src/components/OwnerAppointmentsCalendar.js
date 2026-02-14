import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const collectAppointmentDates = (appointment) => {
  const dates = [];

  const selected = toDate(appointment?.selectedSlot);
  if (selected) dates.push(selected);

  if (!selected && Array.isArray(appointment?.availableSlots)) {
    appointment.availableSlots.forEach((slot) => {
      const parsed = toDate(slot);
      if (parsed) dates.push(parsed);
    });
  }

  if (!dates.length) {
    const created = toDate(appointment?.createdAt);
    if (created) dates.push(created);
  }

  return dates;
};

export default function OwnerAppointmentsCalendar({ appointments = [] }) {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const appointmentsByDay = useMemo(() => {
    const map = new Map();

    appointments.forEach((appointment) => {
      collectAppointmentDates(appointment).forEach((date) => {
        const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(appointment);
      });
    });

    return map;
  }, [appointments]);

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const firstGridDate = new Date(monthStart);
  firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);
    return date;
  });

  const today = new Date();
  const currentMonthLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const goPrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <button type="button" className="btn btn-sm btn-light" onClick={goPrevMonth}>
          ←
        </button>
        <div className="fw-semibold">{currentMonthLabel}</div>
        <button type="button" className="btn btn-sm btn-light" onClick={goNextMonth}>
          →
        </button>
      </div>

      <div className="d-grid" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="small text-muted text-center fw-semibold">
            {day}
          </div>
        ))}

        {days.map((date) => {
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayAppointments = appointmentsByDay.get(key) || [];
          const isCurrentMonth = monthKey(date) === monthKey(currentMonth);
          const isToday =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
          const hasAppointments = dayAppointments.length > 0;

          return (
            <button
              key={key}
              type="button"
              className={`od-calDay ${hasAppointments ? "has-appt" : ""} ${isToday ? "is-today" : ""}`}
              style={{ opacity: isCurrentMonth ? 1 : 0.45 }}
              disabled={!hasAppointments}
              onClick={() => navigate("/appointments")}
              title={
                hasAppointments
                  ? `${dayAppointments.length} appointment${dayAppointments.length > 1 ? "s" : ""}`
                  : "No appointments"
              }
            >
              <span className="od-calNum">{date.getDate()}</span>
              {hasAppointments && <span className="od-calCount">{dayAppointments.length}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
