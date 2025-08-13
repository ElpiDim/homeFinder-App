// src/components/InterestsModal.jsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';

export default function InterestsModal({ interestId, onClose }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [interest, setInterest] = useState(null);

  // Local editable date (owner can propose or accept w/ date)
  const [proposedDate, setProposedDate] = useState('');

  const isOwner = useMemo(() => {
    if (!user || !interest?.propertyId?.ownerId) return false;
    const ownerId = typeof interest.propertyId.ownerId === 'object'
      ? interest.propertyId.ownerId._id
      : interest.propertyId.ownerId;
    return user.id === ownerId;
  }, [user, interest]);

  useEffect(() => {
    let alive = true;
    async function fetchInterest() {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`/api/interests/${interestId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!alive) return;
        setInterest(res.data);
        // prefill proposedDate from server if exists
        if (res.data?.preferredDate) {
          const d = new Date(res.data.preferredDate);
          // to 'YYYY-MM-DDTHH:mm' format for datetime-local
          const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setProposedDate(iso);
        }
      } catch (e) {
        if (!alive) return;
        setError(e.response?.data?.message || 'Failed to load interest.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (interestId && token) fetchInterest();
    return () => {
      alive = false;
    };
  }, [interestId, token]);

  const submitUpdate = async (payload) => {
    setSaving(true);
    setError('');
    try {
      // Your routes expose: PUT /api/interests/:interestId
      const res = await axios.put(`/api/interests/${interestId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterest(res.data?.interest || res.data); // controller returns {message, interest}
      return true;
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    const payload = { status: 'accepted' };
    if (proposedDate) payload.preferredDate = proposedDate;
    const ok = await submitUpdate(payload);
    if (ok) onClose?.(); // close after success
  };

  const handleReject = async () => {
    const ok = await submitUpdate({ status: 'declined' });
    if (ok) onClose?.();
  };

  const handlePropose = async () => {
    if (!proposedDate) {
      setError('Choose a date/time to propose.');
      return;
    }
    // Keep status pending, only set preferredDate (backend should notify "interest_proposed")
    const ok = await submitUpdate({ status: 'pending', preferredDate: proposedDate });
    if (ok) onClose?.();
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Interest details</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <p className="text-muted mb-0">Loading…</p>
        ) : error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : !interest ? (
          <p className="text-muted mb-0">Not found.</p>
        ) : (
          <>
            <div className="mb-3">
              <div><strong>Property:</strong> {interest.propertyId?.title || '—'}</div>
              <div><strong>Location:</strong> {interest.propertyId?.location || '—'}</div>
            </div>

            <div className="mb-3">
              <div><strong>Tenant:</strong> {interest.tenantId?.name || '—'}</div>
              <div><strong>Email:</strong> {interest.tenantId?.email || '—'}</div>
              <div><strong>Phone:</strong> {interest.tenantId?.phone || '—'}</div>
            </div>

            <div className="mb-3">
              <strong>Message:</strong>
              <div className="mt-1">{interest.message || <span className="text-muted">No message</span>}</div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div><strong>Status:</strong> <span className="text-capitalize">{interest.status}</span></div>
              </div>
              <div className="col-6">
                <div><strong>Submitted:</strong> {formatDateTime(interest.submittedAt)}</div>
              </div>
              <div className="col-12">
                <div><strong>Proposed date:</strong> {formatDateTime(interest.preferredDate)}</div>
              </div>
            </div>

            {isOwner && (
              <>
                <hr />
                <Form.Group className="mb-3">
                  <Form.Label>Propose / confirm date & time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    You can set a proposed date alone (keeps status pending) or accept and include a date.
                  </Form.Text>
                </Form.Group>
              </>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-secondary" onClick={onClose} disabled={saving}>
          Close
        </Button>

        {isOwner && !loading && interest && (
          <div className="d-flex gap-2">
            <Button
              variant="outline-danger"
              onClick={handleReject}
              disabled={saving}
              title="Reject interest"
            >
              Reject
            </Button>
            <Button
              variant="outline-primary"
              onClick={handlePropose}
              disabled={saving}
              title="Propose date (keeps pending)"
            >
              Propose date
            </Button>
            <Button
              variant="primary"
              onClick={handleAccept}
              disabled={saving}
              title="Accept interest"
            >
              Accept
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}
