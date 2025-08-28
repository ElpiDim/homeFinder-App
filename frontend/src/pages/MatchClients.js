import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function MatchClients() {
  const [clients, setClients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get('/match/clients', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setClients(data);
      } catch (err) {
        console.error('Failed to fetch client matches', err);
        setClients([]);
      }
    };

    fetchClients();
  }, []);

  return (
    <div className="container mt-4">
      <h3>Suggested Tenants</h3>
      <div className="row">
        {clients.map((c) => (
          <div className="col-md-4 mb-4" key={c._id}>
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{c.name}</h5>
                {c.occupation && <p className="card-text">Occupation: {c.occupation}</p>}
                {(c.incomeMin || c.incomeMax) && (
                  <p className="card-text">
                    Income: €{c.incomeMin ?? '?'} - €{c.incomeMax ?? '?'}
                  </p>
                )}
                {c.familyStatus && (
                  <p className="card-text">Family: {c.familyStatus}</p>
                )}
                <div className="mb-3">
                  {c.hasPets && <span className="badge bg-info text-dark me-2">Pets</span>}
                  {c.smoker && <span className="badge bg-warning text-dark">Smoker</span>}
                </div>
                <button
                  className="mt-auto btn btn-primary"
                  onClick={() => navigate('/messages')}
                >
                  Message
                </button>
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <p className="text-muted">No matches found.</p>
        )}
      </div>
    </div>
  );
}

export default MatchClients;
