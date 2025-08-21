import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import AppointmentModal from '../components/AppointmentModal'; // ✅ σωστό import (front-end modal)

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);            // ✅ ξεσχολιασμένο
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null); // ✅ συνεπές όνομα
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const endpoint =
          user?.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined; // ✅ μόνο αν υπάρχει token

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
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '600px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">Appointments</h4>
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
          <p className="text-muted mb-0">No appointments.</p>
        ) : (
          <ul className="list-group">
            {appointments.map((appt) => (
              <li key={appt._id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{appt.propertyId?.title || 'Property'}</strong>
                    <div className="small text-muted">
                      {appt.status === 'confirmed'
                        ? new Date(appt.selectedSlot).toLocaleString()
                        : 'Pending confirmation'}
                    </div>

                    {user?.role === 'owner' && appt.tenantId && (
                      <div className="mt-1">Tenant: {appt.tenantId.name}</div>
                    )}
                    {user?.role === 'tenant' && appt.ownerId && (
                      <div className="mt-1">Owner: {appt.ownerId.name}</div>
                    )}
                  </div>

                  <div className="d-flex flex-column align-items-end gap-2">
                    {appt.propertyId?._id && (
                    <Link
                      to={`/property/${appt.propertyId._id}`}
                      className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1"
                    >
                      View property
                    </Link>
                  )}

                  {user?.role === 'tenant' && appt.status !== 'confirmed' && (
                    <button
                      className="btn btn-sm btn-primary rounded-pill px-3 py-1"
                      onClick={() => setSelectedAppointmentId(appt._id)}
                    >
                      Choose time
                    </button>
                  )}

                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
          onConfirmed={() => {
            // προαιρετικά κάνε refresh τη λίστα μετά από confirm
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
