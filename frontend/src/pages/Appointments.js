import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const endpoint = user?.role === 'owner' ? '/api/appointments/owner' : '/api/appointments/tenant';
        const res = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const confirmed = res.data.filter(appt => appt.status === 'confirmed');
        setAppointments(confirmed);
      } catch (err) {
        console.error('Error fetching appointments:', err);
      }
    };

    fetchAppointments();
  }, [user, token]);

  return (
    <div className="container py-4">
      <h4 className="mb-3">Appointments</h4>
      {appointments.length === 0 ? (
        <p>No confirmed appointments.</p>
      ) : (
        <ul className="list-group">
          {appointments.map((appt) => (
            <li key={appt._id} className="list-group-item">
              <strong>{appt.propertyId?.title}</strong><br />
              {new Date(appt.selectedSlot).toLocaleString()}
              {user?.role === 'owner' && appt.tenantId && (
                <>
                  <br />Tenant: {appt.tenantId.name}
                </>
              )}
              {user?.role === 'tenant' && appt.ownerId && (
                <>
                  <br />Owner: {appt.ownerId.name}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    </div>
  );
}

export default Appointments;
