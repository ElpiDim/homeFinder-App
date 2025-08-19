// src/components/InterestsModal.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Modal, Form, Button, Badge } from 'react-bootstrap';

function InterestsModal({ interestId, onClose }) {
  const { user } = useAuth();
  const token = localStorage.getItem('token');

  const [interest, setInterest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // εμφανίζουμε UI για προτάσεις ημερομηνιών μόνο μετά το Accept
  const [accepted, setAccepted] = useState(false);

  const [proposedDate, setProposedDate] = useState('');
  const [dateList, setDateList] = useState([]);

  const headers = useMemo(
    () =>
      token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
    [token]
  );

  const isOwner = useMemo(() => {
    if (!user || !interest?.propertyId?.ownerId) return false;
    const ownerId =
      typeof interest.propertyId.ownerId === 'object'
        ? interest.propertyId.ownerId._id
        : interest.propertyId.ownerId;
    const uid = user?.id || user?._id || user?.userId;
    return String(uid) === String(ownerId);
  }, [user, interest]);

  const fmt = (iso) => {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
  };

  const asLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const refetch = useCallback(async () => {
    if (!interestId) return;
    setLoading(true); setError('');
    try {
      const res = await api.get(`/interests/${interestId}`, { headers });
      const data = res.data;
      setInterest(data);
      setAccepted(
        data?.status === 'accepted' || data?.status === 'pending_appointment'
      );
      setProposedDate(asLocalInput(data?.preferredDate));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load interest.');
    } finally {
      setLoading(false);
    }
  }, [interestId, headers]);

  useEffect(() => {
    if (interestId && token) refetch();
  }, [interestId, token, refetch]);

  const submitUpdate = async (payload) => {
    setSaving(true); setError('');
    try {
      const res = await api.put(`/interests/${interestId}`, payload, { headers });
      setInterest(res.data?.interest || res.data);
      return true;
    } catch (e) {
      setError(e.response?.data?.message || 'Update failed.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onAccept = async () => {
    const ok = await submitUpdate({ status: 'accepted' });
    if (ok) { setAccepted(true); await refetch(); }
  };

  const onReject = async () => {
    if (!window.confirm('Are you sure you want to reject this interest?')) return;
    const ok = await submitUpdate({ status: 'declined' });
    if (ok) await refetch();
  };

  // συλλέγει slots από input + list, καθαρίζει/μοναδικοποιεί/μετατρέπει σε ISO
  const buildSlots = () => {
    const all = [
      ...(proposedDate ? [proposedDate] : []),
      ...dateList,
    ];
    const cleaned = Array.from(new Set(
      all
        .map((s) => (s ? new Date(s) : null))
        .filter((d) => d && !Number.isNaN(d.getTime()) && d.getTime() > Date.now())
        .map((d) => d.toISOString())
    ));
    return cleaned;
  };

  const addDate = () => {
    if (!proposedDate) return;
    if (dateList.includes(proposedDate)) return;
    setDateList((prev) => [...prev, proposedDate]);
    setProposedDate('');
  };

  const removeDate = (d) => setDateList((prev) => prev.filter((x) => x !== d));

  // ΠΑΝΤΑ χτυπάμε POST /api/appointments/propose
  const onProposeDates = async () => {
    const slots = buildSlots();
    if (slots.length === 0) return setError('Add at least one future date.');

    const tenantId = interest?.tenantId?._id;
    const propertyId = interest?.propertyId?._id;
    if (!tenantId || !propertyId) {
      return setError('Missing tenantId or propertyId on interest.');
    }

    try {
      setSaving(true); setError('');
      await api.post(
        '/appointments/propose',
        { tenantId, propertyId, availableSlots: slots },
        { headers }
      );
      await refetch();
      setDateList([]);
      setProposedDate('');
      alert('Dates proposed successfully.');
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to propose dates.');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (s) => {
    const map = { accepted: 'success', declined: 'secondary', pending: 'warning', pending_appointment: 'info' };
    return <Badge bg={map[s] || 'secondary'} className="text-capitalize">{s || 'unknown'}</Badge>;
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
            <div className="border rounded p-3 mb-3">
              <div className="d-flex align-items-start">
                <div className="flex-grow-1">
                  <div className="fw-semibold">
                    Property: <span className="fw-normal">{interest.propertyId?.title || '—'}</span>
                  </div>
                  <div className="text-muted">Location: {interest.propertyId?.location || '—'}</div>
                </div>
                <div className="ms-3">{statusBadge(interest.status)}</div>
              </div>
              <div className="row g-2 mt-2 small">
                <div className="col-6">
                  <span className="text-muted">Submitted:</span> {fmt(interest.submittedAt)}
                </div>
                <div className="col-6">
                  <span className="text-muted">Proposed date:</span> {fmt(interest.preferredDate)}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="fw-semibold mb-1">Tenant</div>
              <div className="text-muted">
                <div>Name: {interest.tenantId?.name || '—'}</div>
                <div>Email: {interest.tenantId?.email || '—'}</div>
                <div>Phone: {interest.tenantId?.phone || '—'}</div>
              </div>
            </div>

            {Array.isArray(interest?.proposedDates) && interest.proposedDates.length > 0 && (
              <>
                <hr />
                <div className="fw-semibold mb-2">Already proposed dates</div>
                <ul className="list-group">
                  {interest.proposedDates
                    .slice()
                    .sort((a, b) => new Date(a) - new Date(b))
                    .map((d) => (
                      <li key={d} className="list-group-item">{fmt(d)}</li>
                    ))}
                </ul>
              </>
            )}

            {isOwner && (
              <>
                <hr />
                {!accepted ? (
                  <div className="alert alert-info mb-0">
                    To propose dates you must <strong>Accept</strong> the interest first.
                  </div>
                ) : (
                  <>
                    <Form.Label className="mb-1">Propose / confirm date &amp; time</Form.Label>
                    <div className="d-flex gap-2 align-items-center">
                      <Form.Control
                        type="datetime-local"
                        value={proposedDate}
                        onChange={(e) => setProposedDate(e.target.value)}
                      />
                      <Button variant="outline-primary" onClick={addDate} disabled={!proposedDate}>
                        +
                      </Button>
                    </div>
                    <Form.Text className="text-muted">
                      Use “+” to add more dates. Then click <em>Propose date(s)</em>.
                    </Form.Text>

                    {dateList.length > 0 && (
                      <div className="mt-2 d-flex flex-wrap gap-2">
                        {dateList.map((d) => (
                          <span key={d} className="badge bg-light text-dark border">
                            {fmt(d)}{' '}
                            <button
                              type="button"
                              onClick={() => removeDate(d)}
                              className="btn btn-sm btn-link p-0 ms-1"
                              aria-label="remove date"
                              title="remove"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
          <div className="d-flex flex-wrap gap-2">
            <Button variant="outline-danger" onClick={onReject} disabled={saving}>
              Reject
            </Button>

            {!accepted ? (
              <Button variant="primary" onClick={onAccept} disabled={saving}>
                Accept
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={onProposeDates}
                disabled={saving || (!proposedDate && dateList.length === 0)}
                title={(!proposedDate && dateList.length === 0) ? 'Add at least one date' : ''}
              >
                Propose date(s)
              </Button>
            )}
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default InterestsModal;
