import React, { useEffect, useState } from 'react';
import axios from 'axios';

function interestsModal({ interestId, onClose }) {
  const [interest, setInterest] = useState(null);
  const [status, setStatus] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!interestId) return;

    const fetchInterest = async () => {
      try {
        const res = await axios.get(`/api/interests/${interestId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setInterest(res.data);
        setStatus(res.data.status);
        setPreferredDate(res.data.preferredDate?.split('T')[0] || '');
      } catch (err) {
        console.error('Error fetching interest:', err);
      }
    };

    fetchInterest();
  }, [interestId, token]);

  const handleUpdate = async () => {
    try {
      await axios.put(`/api/interests/${interestId}`, {
        status,
        preferredDate: preferredDate || null,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Interest updated!');
      onClose();
    } catch (err) {
      console.error('Update error:', err);
      alert('Failed to update interest.');
    }
  };

  if (!interest) return null;

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Interest Details</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <h6>Tenant Info</h6>
            <p><strong>Name:</strong> {interest.tenantId?.name}</p>
            <p><strong>Email:</strong> {interest.tenantId?.email}</p>
            <p><strong>Phone:</strong> {interest.tenantId?.phone}</p>

            <h6>Property</h6>
            <p><strong>Title:</strong> {interest.propertyId?.title}</p>

            <h6>Message</h6>
            <p>{interest.message || '-'}</p>

            <div className="mb-3">
              <label className="form-label">Appointment Date</label>
              <input
                type="date"
                className="form-control"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accept</option>
                <option value="declined">Decline</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={handleUpdate}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default interestsModal;
