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
  const [success, setSuccess] = useState('');
  const [interest, setInterest] = useState(null);

  const [ownerProposals, setOwnerProposals] = useState(['']);
  const [selectedAcceptDate, setSelectedAcceptDate] = useState('');

  const isOwner = useMemo(() => {
    if (!user || !interest?.propertyId?.ownerId) return false;
    const ownerId = typeof interest.propertyId.ownerId === 'object'
      ? interest.propertyId.ownerId._id
      : interest.propertyId.ownerId;
    return user.id === ownerId;
  }, [user, interest]);

  const fetchInterest = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.get(`/api/interests/${interestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterest(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load interest.');
    } finally {
      setLoading(false);
      setOwnerProposals(['']);
      setSelectedAcceptDate('');
    }
  };

  useEffect(() => {
    if (interestId && token) fetchInterest();
  }, [interestId, token]);

  const updateProposal = (idx, value) => {
    const next = [...ownerProposals];
    next[idx] = value;
    setOwnerProposals(next);
  };

  const addProposalInput = () => setOwnerProposals([...ownerProposals, '']);

  const handlePropose = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    const dates = ownerProposals.filter(Boolean);
    if (dates.length === 0) {
      setError('Please add at least one date.');
      setSaving(false);
      return;
    }
    try {
      await axios.post(`/api/interests/${interestId}/proposals`, { dates }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Dates proposed.');
      await fetchInterest();
    } catch (e) {
      setError(e.response?.data?.message || 'Proposal failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await axios.put(`/api/interests/${interestId}`, {
        status: 'accepted',
        preferredDate: selectedAcceptDate || undefined,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Interest accepted.');
      await fetchInterest();
    } catch (e) {
      setError(e.response?.data?.message || 'Accept failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await axios.put(`/api/interests/${interestId}`, { status: 'declined' }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Interest rejected.');
      await fetchInterest();
    } catch (e) {
      setError(e.response?.data?.message || 'Reject failed.');
    } finally {
      setSaving(false);
    }
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
            {success && <div className="alert alert-success">{success}</div>}

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

            <div className="mb-3">
              <div><strong>Status:</strong> <span className="text-capitalize">{interest.status}</span></div>
              <div><strong>Submitted:</strong> {formatDateTime(interest.submittedAt)}</div>
            </div>

            <div className="mb-3">
              <strong>Proposed dates:</strong>
              <ul className="mt-2">
                {(interest.proposedDates || []).length === 0 ? (
                  <li className="text-muted">None</li>
                ) : (
                  interest.proposedDates.map((d) => (
                    <li key={d}>{formatDateTime(d)}</li>
                  ))
                )}
              </ul>
            </div>

            {isOwner && (
              <>
                <hr />
                <div className="mb-3">
                  <strong>Propose new dates</strong>
                  {ownerProposals.map((val, idx) => (
                    <Form.Control
                      key={idx}
                      type="datetime-local"
                      className="mt-2"
                      value={val}
                      onChange={(e) => updateProposal(idx, e.target.value)}
                    />
                  ))}
                  <Button variant="link" className="p-0 mt-2" onClick={addProposalInput}>
                    + Add another
                  </Button>
                  <Button
                    variant="outline-primary"
                    className="mt-3"
                    onClick={handlePropose}
                    disabled={saving}
                  >
                    Propose dates
                  </Button>
                </div>

                <Form.Group className="mb-3">
                  <Form.Label>Choose a date to accept (optional)</Form.Label>
                  <Form.Select
                    value={selectedAcceptDate}
                    onChange={(e) => setSelectedAcceptDate(e.target.value)}
                  >
                    <option value="">-- none --</option>
                    {interest.proposedDates?.map((d) => {
                      const iso = new Date(d).toISOString().slice(0,16);
                      return (
                        <option key={d} value={iso}>
                          {formatDateTime(d)}
                        </option>
                      );
                    })}
                  </Form.Select>
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
            <Button variant="primary" onClick={handleAccept} disabled={saving}>
              Accept
            </Button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}
