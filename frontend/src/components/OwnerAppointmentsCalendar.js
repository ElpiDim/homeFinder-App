import React, { useEffect, useMemo, useState } from 'react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
      .filter((appt) => (appt.status || '').toLowerCase() === 'confirmed');
  }, [appointments]);

  const pendingCount = useMemo(
    () => appointments.filter((appt) => (appt.status || '').toLowerCase() !== 'confirmed').length,
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
    for (let i = 0; i < leadingEmpty; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day, appointments: appointmentsByDay[day] || [] });
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return { cells, appointmentsByDay };
  }, [currentMonth, confirmedAppointments]);

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    []
  );

  const detailFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
      date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth()
    );
  };

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const exists = confirmedAppointments.some((appt) => appt._id === selectedAppointmentId);
    if (!exists) {
      setSelectedAppointmentId(null);
    }
  }, [confirmedAppointments, selectedAppointmentId]);

  const selectedAppointment = useMemo(
    () => confirmedAppointments.find((appt) => appt._id === selectedAppointmentId) || null,
    [confirmedAppointments, selectedAppointmentId]
  );

  return (
    <div
      className="p-4 rounded-4 shadow-sm"
      style={{ background: '#ffffffcc', border: '1px solid #eef2f4' }}
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-pill px-3"
          onClick={goPreviousMonth}
        >
          ‹
        </button>
        <div className="fw-semibold text-capitalize">
          {monthFormatter.format(currentMonth)}
        </div>
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
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '6px', fontSize: '0.8rem' }}
      >
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center fw-semibold text-muted text-uppercase" style={{ fontSize: '0.75rem' }}>
            {weekday}
          </div>
        ))}

        {calendar.cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} style={{ minHeight: 64 }} />;
          }
          const { day, appointments: dayAppointments } = cell;
          const hasAppointments = dayAppointments.length > 0;
          const isToday = today.getDate() === day && isCurrentMonth(today);

          return (
            <div
              key={`day-${day}`}
              className="rounded-3 border position-relative"
              style={{
                minHeight: 72,
                padding: '6px 8px',
                background: hasAppointments ? '#dcfce7' : '#f9fafb',
                borderColor: isToday ? '#16a34a' : '#e5e7eb',
              }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{day}</span>
                {isToday && (
                  <span className="badge bg-success" style={{ fontSize: '0.6rem' }}>Today</span>
                )}
              </div>
              {hasAppointments && (
                <div className="mt-2 d-flex flex-column gap-1">
                  {dayAppointments.slice(0, 2).map((appt) => (
                    <button
                      type="button"
                      key={appt._id}
                      className="badge rounded-pill border-0"
                      style={{
                        background:
                          selectedAppointmentId === appt._id ? '#0f766e' : '#16a34a',
                        color: '#fff',
                        fontSize: '0.65rem',
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedAppointmentId(appt._id)}
                    >
                      {timeFormatter.format(appt.date)}
                    </button>
                  ))}
                  {dayAppointments.length > 2 && (
                    <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                      +{dayAppointments.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedAppointment && (
        <div
          className="mt-3 p-3 rounded-4 border"
          style={{
            background: '#ecfdf5',
            borderColor: '#99f6e4',
          }}
        >
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h6 className="fw-semibold mb-0" style={{ fontSize: '0.95rem' }}>
              Appointment details
            </h6>
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-muted p-0"
              onClick={() => setSelectedAppointmentId(null)}
            >
              Clear
            </button>
          </div>
          <dl className="row mb-0" style={{ fontSize: '0.85rem' }}>
            <dt className="col-sm-4 text-muted">Tenant</dt>
            <dd className="col-sm-8 mb-2">
              {selectedAppointment.tenantId?.name || '—'}
            </dd>
            <dt className="col-sm-4 text-muted">Phone</dt>
            <dd className="col-sm-8 mb-2">
              {selectedAppointment.tenantId?.phone || 'Not provided'}
            </dd>
            <dt className="col-sm-4 text-muted">Date</dt>
            <dd className="col-sm-8 mb-2">
              {detailFormatter.format(selectedAppointment.date)}
            </dd>
            <dt className="col-sm-4 text-muted">Property</dt>
            <dd className="col-sm-8 mb-0">
              {selectedAppointment.propertyId?.title || 'Property viewing'}
            </dd>
          </dl>
        </div>
      )}

      <div className="mt-3">
        <h6 className="fw-semibold mb-2" style={{ fontSize: '0.9rem' }}>Upcoming appointments</h6>
        {upcoming.length === 0 ? (
          <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
            No confirmed appointments on the calendar yet.
          </p>
        ) : (
          <ul className="list-unstyled mb-0" style={{ fontSize: '0.85rem' }}>
            {upcoming.map((appt) => (
              <li key={`upcoming-${appt._id}`} className="d-flex flex-column mb-2">
                <span className="fw-semibold">{appt.propertyId?.title || 'Property viewing'}</span>
                <span className="text-muted">{timeFormatter.format(appt.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingCount > 0 && (
        <div
          className="alert alert-warning mt-3 mb-0 py-2 px-3"
          style={{ fontSize: '0.8rem', background: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}
        >
          You have {pendingCount} appointment{pendingCount > 1 ? 's' : ''} waiting for confirmation.
        </div>
      )}
    </div>
  );
}

export default OwnerAppointmentsCalendar;