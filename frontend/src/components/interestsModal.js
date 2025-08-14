// src/components/InterestsModal.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import ProposeAppointmentModal from './ProposeAppointmentModal';
import { useAuth } from '../context/AuthContext';
import { Modal, Form, Button } from 'react-bootstrap';

function interestsModal({ interestId, onClose }) {
  const [interest, setInterest] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [proposedDate, setProposedDate] = useState('');

  const isOwner = useMemo(() => {
    if (!user || !interest?.propertyId?.ownerId) return false;
    const ownerId =
      typeof interest.propertyId.ownerId === 'object'
        ? interest.propertyId.ownerId._id
        : interest.propertyId.ownerId;
    const uid = user?.id || user?._id || user?.userId;
    return String(uid) === String(ownerId);
  }, [user, interest]);

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const refetchInterest = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/interests/${interestId}`, { headers });
      setInterest(res.data);

      if (res.data?.preferredDate) {
        const d = new Date(res.data.preferredDate);
        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setProposedDate(isoLocal);
      } else {
        setProposedDate('');
      }
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load interest.');
    } finally {
      setLoading(false);
    }
  }, [interestId, headers]);

  useEffect(() => {
    if (interestId && token) refetchInterest();
  }, [interestId, token, refetchInterest]);

  const submitUpdate = async (payload) => {
    setSaving(true);
    setError('');
    try {
      const res = await axios.put(`/api/interests/${interestId}`, payload, { headers });
      setInterest(res.data?.interest || res.data);
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
    if (ok) onClose?.();
  };

  const handleReject = async () => {
    const ok = await submitUpdate({ status: 'declined' });
    if (ok) onClose?.();
  };

  const handleProposeSingle = async () => {
    if (!proposedDate) {
      setError('Choose a date/time to propose.');
      return;
    }
    const ok = await submitUpdate({ status: 'pending', preferredDate: proposedDate });
    if (ok) onClose?.();
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
              <div>
                <strong>Property:</strong> {interest.propertyId?.title || '—'}
              </div>
              <div>
                <strong>Location:</strong> {interest.propertyId?.location || '—'}
              </div>
            </div>

            <div className="mb-3">
              <div>
                <strong>Tenant:</strong> {interest.tenantId?.name || '—'}
              </div>
              <div>
                <strong>Email:</strong> {interest.tenantId?.email || '—'}
              </div>
              <div>
                <strong>Phone:</strong> {interest.tenantId?.phone || '—'}
              </div>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <div>
                  <strong>Status:</strong>{' '}
                  <span className="text-capitalize">{interest.status}</span>
                </div>
              </div>
              <div className="col-6">
                <div>
                  <strong>Submitted:</strong> {formatDateTime(interest.submittedAt)}
                </div>
              </div>
              <div className="col-12">
                <div>
                  <strong>Proposed date:</strong> {formatDateTime(interest.preferredDate)}
                </div>
              </div>
            </div>

            {Array.isArray(interest?.proposedDates) && interest.proposedDates.length > 0 && (
              <>
                <hr />
                <div className="mb-2 fw-semibold">Already proposed dates</div>
                <ul className="list-group">
                  {interest.proposedDates
                    .slice()
                    .sort((a, b) => new Date(a) - new Date(b))
                    .map((d) => (
                      <li key={d} className="list-group-item">
                        {formatDateTime(d)}
                      </li>
                    ))}
                </ul>
              </>
            )}

            {isOwner && (
              <>
                <hr />
                <Form.Group className="mb-3">
                  <Form.Label>Propose / confirm date &amp; time</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                  />
                  <Form.Text className="text-muted">
                    You can set a single proposed date (keeps status pending), or accept and
                    include a date.
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
            <Button variant="outline-danger" onClick={handleReject} disabled={saving}>
              Reject
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => setShowAppointmentModal(true)}
              disabled={saving}
              title="Propose multiple dates"
            >
              Propose multiple dates
            </Button>
            <Button
              variant="outline-primary"
              onClick={handleProposeSingle}
              disabled={saving}
              title="Propose single date (keeps pending)"
            >
              Propose date
            </Button>
            <Button variant="primary" onClick={handleAccept} disabled={saving}>
              Accept
            </Button>
          </div>
        )}
      </Modal.Footer>

      {isOwner && showAppointmentModal && (
        <ProposeAppointmentModal
          show={showAppointmentModal}
          onClose={async (didSubmit) => {
            setShowAppointmentModal(false);
            if (didSubmit) {
              await refetchInterest();
            }
          }}
          interestId={interest._id}
          tenantId={interest.tenantId?._id}
          propertyId={interest.propertyId?._id}
        />
      )}
    </Modal>
  );
}

export default interestsModal;
