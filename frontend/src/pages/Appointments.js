import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import AppointmentModal from '../components/AppointmentModal';

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : undefined),
    [token]
  );

  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const endpoint =
        user?.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
      const res = await api.get(endpoint, { headers: authHeaders });
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDecline = async (appointmentId) => {
    setActionLoading(`decline-${appointmentId}`);
    setError('');
    try {
      await api.patch(`/appointments/${appointmentId}/decline`, {}, { headers: authHeaders });
      await fetchAppointments();
    } catch (err) {
      console.error('Error declining appointment:', err);
      setError(err.response?.data?.message || 'Failed to decline appointment.');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async (appointmentId) => {
    setActionLoading(`cancel-${appointmentId}`);
    setError('');
    try {
      await api.patch(`/appointments/${appointmentId}/cancel`, {}, { headers: authHeaders });
      await fetchAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      setError(err.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setActionLoading('');
    }
  };

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
                  <div className="me-3" style={{ flex: 1 }}>
                    <h6 className="fw-semibold mb-1">
                      {appt.propertyId?.title || 'Property'}
                    </h6>
                    <div className="small text-muted mb-1 text-capitalize">
                      Status: {appt.status || 'pending'}
                    </div>

                    {appt.status === 'confirmed' && appt.selectedSlot && (
                      <div className="small fw-semibold text-success">
                        Confirmed for {new Date(appt.selectedSlot).toLocaleString()}
                      </div>
                    )}

                    {appt.status === 'pending' && (
                      <div className="small text-muted">
                        {user?.role === 'owner'
                          ? 'Awaiting tenant response.'
                          : 'Please pick one of the available slots:'}
                      </div>
                    )}

                    {appt.status === 'declined' && (
                      <div className="small text-danger">Appointment declined.</div>
                    )}

                    {appt.status === 'cancelled' && (
                      <div className="small text-danger">Appointment cancelled.</div>
                    )}

                    {user?.role === 'owner' && appt.tenantId && (
                      <div className="small mt-2">Tenant: {appt.tenantId.name}</div>
                    )}
                    {user?.role === 'client' && appt.ownerId && (
                      <div className="small mt-2">Owner: {appt.ownerId.name}</div>
                    )}

                    {appt.status === 'pending' && appt.availableSlots?.length > 0 && (
                      <ul className="list-unstyled small mt-2 mb-0">
                        {appt.availableSlots.map((slot, idx) => (
                          <li key={idx} className="text-muted">
                            {new Date(slot).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    )}

                    {appt.status === 'confirmed' && appt.availableSlots?.length && (
                      <div className="small text-muted mt-2">
                        Proposed options: {appt.availableSlots.length}
                      </div>
                    )}
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    {appt.propertyId?._id && (
                      <Link
                        to={`/property/${appt.propertyId._id}`}
                        className="btn btn-sm rounded-pill px-3 py-1"
                        style={{
                          background: "linear-gradient(135deg,#006400,#90ee90)",
                          color: "#fff",
                          fontWeight: 600,
                          border: "none",
                        }}
                      >
                        View property
                      </Link>
                    )}

                    {user?.role === 'client' && appt.status === 'pending' && (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-success rounded-pill px-3 py-1"
                          onClick={() => setSelectedAppointment(appt)}
                        >
                          Accept
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                          onClick={() => handleDecline(appt._id)}
                          disabled={actionLoading === `decline-${appt._id}`}
                        >
                          {actionLoading === `decline-${appt._id}` ? 'Declining…' : 'Decline'}
                        </button>
                      </div>
                    )}

                    {user?.role === 'client' && appt.status === 'confirmed' && (
                      <button
                        className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                        onClick={() => handleCancel(appt._id)}
                        disabled={actionLoading === `cancel-${appt._id}`}
                      >
                        {actionLoading === `cancel-${appt._id}` ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}

                    {user?.role === 'owner' && ['pending', 'confirmed'].includes(appt.status) && (
                      <button
                        className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1"
                        onClick={() => handleCancel(appt._id)}
                        disabled={actionLoading === `cancel-${appt._id}`}
                      >
                        {actionLoading === `cancel-${appt._id}` ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedAppointment && (
        <AppointmentModal
          appointmentId={selectedAppointment._id}
          initialAppointment={selectedAppointment}
          onClose={(shouldRefresh) => {
            setSelectedAppointment(null);
            if (shouldRefresh) {
              fetchAppointments();
            }
          }}
        />
      )}
    </div>
  );
}

export default Appointments;
