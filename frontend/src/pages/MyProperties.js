// src/pages/MyProperties.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Button, Table, Badge, Spinner } from 'react-bootstrap';

export default function MyProperties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ίδιο pastel gradient
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  useEffect(() => {
    const load = async () => {
      if (!user || user.role !== 'owner') return setLoading(false);
      try {
        const token = localStorage.getItem('token');
        // Προτιμώ backend που επιστρέφει ήδη counts:
        const res = await api.get('/properties/mine?includeStats=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setItems(res.data || []);
      } catch (e) {
        console.error('Failed to load my properties', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

    const handleDelete = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(items.filter((p) => p._id !== id));
    } catch (e) {
      console.error('Failed to delete property', e);
    }
  };
  if (!user) {
    return (
      <div style={pageGradient}>
        <div className="container py-5">Loading…</div>
      </div>
    );
  }

  if (user.role !== 'owner') {
    return (
      <div style={pageGradient}>
        <div className="container py-5">
          <p className="text-danger">Only owners can view this page.</p>
          <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
            ← Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageGradient}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="fw-bold mb-0">My Properties</h4>
          <Link to="/add-property" className="btn btn-primary rounded-pill px-4">+ Add Property</Link>
        </div>

        {loading ? (
          <div className="d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" /> <span>Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted">You have no properties yet.</p>
        ) : (
          <div className="table-responsive">
            <Table hover className="bg-white rounded shadow-sm">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Price (€)</th>
                  <th>Status</th>
                  <th>Favorites</th>
                  <th>Views</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p._id}>
                    <td className="fw-semibold">{p.title}</td>
                    <td>{p.location}</td>
                    <td>{p.type}</td>
                    <td>{p.price}</td>
                    <td>
                      <Badge bg={p.status === 'available' ? 'success' : p.status === 'sold' ? 'secondary' : 'warning'} text="light">
                        {p.status}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="warning" text="dark">{p.favoritesCount ?? 0}</Badge>
                    </td>
                    <td>
                      <Badge bg="info" text="dark">{p.viewsCount ?? 0}</Badge>
                    </td>
                    <td className="text-end">
                      <div className="btn-group">
                        <Link to={`/property/${p._id}`} className="btn btn-sm btn-outline-secondary">Open</Link>
                        <Link to={`/edit-property/${p._id}`} className="btn btn-sm btn-primary">Edit</Link>
                        <button onClick={() => handleDelete(p._id)} className="btn btn-sm btn-danger">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        <Button variant="outline-secondary rounded-pill px-4" className="mt-3" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
