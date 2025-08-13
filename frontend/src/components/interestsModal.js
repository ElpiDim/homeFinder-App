import React, { useEffect, useState } from 'react';
import axios from 'axios';
import ProposeAppointmentModal from './ProposeAppointmentModal';
import {useAuth} from '../context/AuthContext';


function InterestsModal({ interestId, onClose }) {
  const [interest, setInterest] = useState(null);
  const [status, setStatus] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const {user} = useAuth();
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
        setPreferredDate(
          res.data.preferredDate
            ? new Date(res.data.preferredDate).toISOString().slice(0, 16)
            : ''
        );
      } catch (err) {
        console.error('Error fetching interest:', err);
      }
    };

    fetchInterest();
  }, [interestId, token]);

  const isOwner=
    user && interest?.propertyId?.ownerId && interest.propertyId.ownerId === user._id;

  const handleUpdate = async () => {
    if (!isOwner) return; 
    try {
      await axios.put(
        `/api/interests/${interestId}/status`,
        {
          status,
          preferredDate: preferredDate
            ? new Date(preferredDate).toISOString()
            : null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
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

            <h6>Property Title: </h6>
            <p>{interest.propertyId?.title}</p>

            <h6>Message</h6>
            <p>{interest.message || '-'}</p>


            {isOwner && (
              <>
              
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

                {status === 'accepted' && (
                  <div className="mb-3">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowAppointmentModal(true)}
                    >
                      📅 Propose Appointment
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
             {isOwner && (
              <button className="btn btn-primary" onClick={handleUpdate}>
                Save
              </button>
            )}
          </div>
        </div>
      </div>

      {isOwner && showAppointmentModal && (
        <ProposeAppointmentModal
          show={showAppointmentModal}
          onClose={() => setShowAppointmentModal(false)}
          tenantId={interest.tenantId?._id}
          propertyId={interest.propertyId?._id}
        />
      )}
    </div>
  );
}

export default InterestsModal;
