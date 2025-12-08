import React, { useEffect, useState, useMemo } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import AppointmentModal from '../components/AppointmentModal';

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #f3e5f5 0%, #ede7f6 33%, #e1bee7 66%, #f8f1fa 100%)',
  }), []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const endpoint =
          user?.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await api.get(endpoint, { headers });
        setAppointments(res.data || []);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments.');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchAppointments();
  }, [user, token]);

  if (!user) {
    return (
      <div style={pageGradient}>
        <div className="container mt-5">Loading…</div>
      </div>
    );
  }

  return (
    <div style={pageGradient} className="py-5">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Appointments</h2>
            <div className="text-muted">
              {user.role === 'owner'
                ? "Manage and review your property appointments."
                : "Here are your scheduled property viewings."}
            </div>
          </div>
          <button
            className="btn btn-outline-secondary rounded-pill px-3 py-2"
            onClick={() => navigate('/dashboard')}
          >
            ← Back
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : appointments.length === 0 ? (
          <div className="p-4 rounded-4 shadow-sm bg-white border text-center text-muted">
            No appointments found.
          </div>
        ) : (
          <div className="row g-3">
            {appointments.map((appt) => (
              <div className="col-12" key={appt._id}>
                <div
                  className="p-3 rounded-4 shadow-sm bg-white border d-flex justify-content-between align-items-start"
                  style={{ border: '1px solid #eef2f4' }}
                >
                  <div>
                    <h6 className="fw-semibold mb-1">
                      {appt.propertyId?.title || 'Property'}
                    </h6>
                    <div className="small text-muted">
                      {appt.status === 'confirmed'
                        ? new Date(appt.selectedSlot).toLocaleString()
                        : 'Pending confirmation'}
                    </div>

                    {user?.role === 'owner' && appt.tenantId && (
                      <div className="small mt-1">Tenant: {appt.tenantId.name}</div>
                    )}
                    {user?.role === 'client' && appt.ownerId && (
                      <div className="small mt-1">Owner: {appt.ownerId.name}</div>
                    )}
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    {appt.propertyId?._id && (
                    <Link
                      to={`/property/${appt.propertyId._id}`}
                      className="btn btn-sm rounded-pill px-3 py-1"
                      style={{
                        background: "linear-gradient(135deg,#4b0082,#e0b0ff)",
                        color: "#fff",
                        fontWeight: 600,
                        border: "none"
                      }}
                    >
                      View property
                    </Link>
                  )}

                    {user?.role === 'client' && appt.status !== 'confirmed' && (
                      <button
                        className="btn btn-sm btn-success rounded-pill px-3 py-1"
                        onClick={() => setSelectedAppointmentId(appt._id)}
                      >
                        Choose time
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
          onConfirmed={() => {
            setSelectedAppointmentId(null);
            setLoading(true);
            api
              .get(user?.role === 'owner' ? '/appointments/owner' : '/appointments/tenant', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              })
              .then((res) => setAppointments(res.data || []))
              .catch(() => {})
              .finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}

export default Appointments;
