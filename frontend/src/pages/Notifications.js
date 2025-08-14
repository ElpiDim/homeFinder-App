// src/pages/NotificationsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import AppointmentModal from '../components/AppointmentModal';
import InterestsModal from '../components/interestsModal';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // all | unread
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [selectedInterestId, setSelectedInterestId] = useState(null);
  const token = localStorage.getItem('token');

  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(res.data || []);
    } catch (e) {
      console.error('Fetch notifications failed', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markAllRead = async () => {
    try {
      const unread = items.filter(n => !n.read);
      await Promise.all(
        unread.map(n =>
          axios.patch(`/api/notifications/${n._id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      setItems(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Mark all read failed', e);
    }
  };

  const markSingleRead = async (noteId) => {
    try {
      await axios.patch(`/api/notifications/${noteId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(prev => prev.map(n => n._id === noteId ? { ...n, read: true } : n));
    } catch {
      /* no-op */
    }
  };

  const filtered = items.filter(n => (filter === 'unread' ? !n.read : true));

  const renderText = (note) => {
    if (note.type === 'favorite') {
      const name = note?.senderId?.name || 'Someone';
      return `${name} added your property to favorites.`;
    }
    if (note.type === 'interest' || note.type === 'interest_accepted' || note.type === 'interest_rejected') {
      const name = note?.senderId?.name || 'Someone';
      return note.message || `${name} sent an interest.`;
    }
    if (note.type === 'appointment') {
      return note.message || 'New appointment scheduled.';
    }
    if (note.type === 'property_removed') {
      return note.message || 'A property you interacted with was removed.';
    }
    if (note.type === 'message') {
      return note.message || 'New message received.';
    }
    return note.message || 'Notification';
  };

  const openAppointment = async (note) => {
    if (!note.read) await markSingleRead(note._id);
    setSelectedAppointmentId(note.referenceId); // appointmentId
  };

  const openInterest = async (note) => {
    if (!note.read) await markSingleRead(note._id);
    setSelectedInterestId(note.referenceId); // interestId
  };

  const actionButton = (note) => {
    // Όλα ίδια εμφάνιση με το λευκό-μπλε κουμπί
    if (note.type === 'appointment') {
      return (
        <button
          className="btn btn-sm btn-white-outline-primary"
          onClick={() => openAppointment(note)}
          disabled={!note.referenceId}
        >
          Show details
        </button>
      );
    }
     if (note.type === 'interest' || note.type === 'interest_accepted' || note.type === 'interest_rejected') {
      return (
        <button
          className="btn btn-sm btn-white-outline-primary"
          onClick={() => openInterest(note)}
          disabled={!note.referenceId}
        >
          Show details
        </button>
      );
    }
    // default: link στο property (favorite, property_removed, message, κ.λπ.)
    if (note.referenceId) {
      return (
        <Link
          to={`/property/${note.referenceId}`}
          className="btn btn-sm btn-white-outline-primary"
          onClick={() => !note.read && markSingleRead(note._id)}
        >
          Show details
        </Link>
      );
    }
    return null;
  };

  return (
    <div style={pageGradient}>
      <div className="container py-5">
        <div className="bg-white shadow-sm rounded p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="fw-bold mb-0">Notifications</h4>
            <div className="d-flex gap-2">
              <div className="btn-group">
                <button
                  className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button
                  className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('unread')}
                >
                  Unread
                </button>
              </div>
              <button className="btn btn-sm btn-outline-secondary" onClick={fetchAll}>
                Refresh
              </button>
              <button className="btn btn-sm btn-outline-success" onClick={markAllRead}>
                Mark all as read
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-muted mb-0">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted mb-0">No notifications.</p>
          ) : (
            <ul className="list-group">
              {filtered.map((note) => (
                <li
                  key={note._id}
                  className="list-group-item d-flex justify-content-between align-items-start"
                  style={{ background: note.read ? '#fff' : '#f8fafc' }}
                >
                  <div className="me-3">
                    {/* Ομοιόμορφο μέγεθος γραμματοσειράς */}
                    <div className="fw-semibold" style={{ fontSize: 14 }}>
                      {renderText(note)}
                    </div>

                    {/* Action line, ίδιο style για όλα */}
                    <div style={{ fontSize: 14 }} className="mt-1">
                      {actionButton(note)}
                    </div>
                  </div>

                  {!note.read && (
                    <span className="badge bg-primary align-self-center">New</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 d-flex justify-content-end">
            <button className="btn btn-outline-secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
      {selectedInterestId && (
        <InterestsModal
          interestId={selectedInterestId}
          onClose={() => setSelectedInterestId(null)}
        />
      )}
    </div>
  );
}
