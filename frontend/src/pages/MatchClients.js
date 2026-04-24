import React, { useEffect, useState } from 'react';
import api from 'api';

function MatchClients() {
  const [candidates, setCandidates] = useState([]);
  const [processingId, setProcessingId] = useState('');

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const res = await api.get('/match-candidates/owner', {
          params: { status: 'pending' },
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setCandidates(data);
      } catch (err) {
        console.error('Failed to fetch candidate matches', err);
        setCandidates([]);
      }
    };

    fetchCandidates();
  }, []);

  const onDecision = async (candidateId, action) => {
    try {
      setProcessingId(candidateId);
      await api.patch(`/match-candidates/${candidateId}/${action}`);
      setCandidates((prev) => prev.filter((c) => c._id !== candidateId));
    } catch (err) {
      console.error(`Failed to ${action} candidate`, err);
    } finally {
      setProcessingId('');
    }
  };

  return (
    <div className="container mt-4">
      <h3>Suggested Tenants (Pending Approval)</h3>
      <div className="row">
        {candidates.map((candidate) => {
          const c = candidate.clientId || {};
          const p = candidate.propertyId || {};
          return (
          <div className="col-md-4 mb-4" key={candidate._id}>
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{c.name}</h5>
                <p className="card-text mb-1">
                  <strong>Property:</strong> {p.title || 'Property'}
                </p>
                {c.occupation && <p className="card-text">Occupation: {c.occupation}</p>}
                {c.salary && (
                  <p className="card-text">
                    Salary: €{c.salary}
                  </p>
                )}
                <div className="mb-3">
                  {c.hasPets && <span className="badge bg-info text-dark me-2">Pets</span>}
                  {c.smoker && <span className="badge bg-warning text-dark">Smoker</span>}
                </div>
                <div className="mt-auto d-flex gap-2">
                  <button
                    className="btn btn-success"
                    disabled={processingId === candidate._id}
                    onClick={() => onDecision(candidate._id, 'approve')}
                  >
                    Approve
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    disabled={processingId === candidate._id}
                    onClick={() => onDecision(candidate._id, 'reject')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        )})}
        {candidates.length === 0 && (
          <p className="text-muted">No pending matches found.</p>
        )}
      </div>
    </div>
  );
}

export default MatchClients;
