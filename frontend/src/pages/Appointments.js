import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // Pastel gradient (same as other pages)
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const endpoint =
          user?.role === 'owner' ? '/api/appointments/owner' : '/api/appointments/tenant';

        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const confirmed = res.data.filter((appt) => appt.status === 'confirmed');
        setAppointments(confirmed);
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
          <button className="btn btn-outline-secondary" onClick={() => navigate('/dashboard')}>
            ← Back
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : appointments.length === 0 ? (
          <p className="text-muted mb-0">No confirmed appointments.</p>
        ) : (
          <ul className="list-group">
            {appointments.map((appt) => (
              <li key={appt._id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{appt.propertyId?.title || 'Property'}</strong>
                    <div className="small text-muted">
                      {new Date(appt.selectedSlot).toLocaleString()}
                    </div>

                    {user?.role === 'owner' && appt.tenantId && (
                      <div className="mt-1">Tenant: {appt.tenantId.name}</div>
                    )}
                    {user?.role === 'tenant' && appt.ownerId && (
                      <div className="mt-1">Owner: {appt.ownerId.name}</div>
                    )}
                  </div>

                  {appt.propertyId?._id && (
                    <Link
                      to={`/property/${appt.propertyId._id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      View property
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Appointments;
