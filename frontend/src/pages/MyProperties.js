// src/pages/MyProperties.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Button, Spinner, Row, Col, Card, Badge, Container } from 'react-bootstrap';

export default function MyProperties() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);


    
  useEffect(() => {
    const load = async () => {
      if (!user || user.role !== 'owner') return setLoading(false);
      try {
        const token = localStorage.getItem('token');
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

  const imgUrl = (src) =>
    src
      ? src.startsWith('http')
        ? src
        : `http://localhost:5000${src}`
      : 'https://via.placeholder.com/600x360?text=No+Image';

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this property?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/properties/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      console.error('Failed to delete property', e);
    }
  };

  if (!user) {
    return (
      <div style={pageGradient}>
        <Container className="py-5">Loading…</Container>
      </div>
    );
  }

  if (user.role !== 'owner') {
    return (
      <div style={pageGradient}>
        <Container className="py-5">
          <p className="text-danger">Only owners can view this page.</p>
          <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
            ← Back
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div style={pageGradient}>
      <Container className="py-5">

        {/* Top bar: Back (left) + Title (next) + Add (right) */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              onClick={() => navigate('/dashboard')}
            >
              ← Back to Dashboard
            </Button>
            <h3 className="fw-bold mb-0">My Properties</h3>
          </div>

          <Link to="/add-property" className="btn btn-primary rounded-pill px-4">
            + Add Property
          </Link>
        </div>

        {loading ? (
          <div className="d-flex align-items-center gap-2">
            <Spinner animation="border" size="sm" /> <span>Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted">You have no properties yet.</p>
        ) : (
          <Row className="g-4">
            {items.map((p) => (
              <Col md={6} lg={4} key={p._id}>
                <Card className="h-100 shadow-sm border-0">
                  <Link to={`/property/${p._id}`} className="text-decoration-none text-dark">
                    <div
                      className="ratio ratio-16x9 rounded-top"
                      style={{
                        backgroundImage: `url(${imgUrl(p.images?.[0])})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <Card.Body className="d-flex flex-column">
                      <Card.Title className="fw-semibold mb-1">{p.title}</Card.Title>
                      <div className="text-muted small mb-1">📍 {p.location}</div>
                      <div className="text-muted small mb-1">
                        💶 {Number(p.price).toLocaleString()} €
                      </div>
                      {p.type && <div className="text-muted small mb-3">🏷️ {p.type}</div>}
                      <div className="mt-auto d-flex gap-2 flex-wrap">
                        <Badge
                          bg={
                            p.status === 'available'
                              ? 'success'
                              : p.status === 'sold'
                              ? 'secondary'
                              : 'warning'
                          }
                          text="light"
                        >
                          {p.status}
                        </Badge>
                        <Badge bg="warning" text="dark">
                          ⭐ {p.favoritesCount ?? 0}
                        </Badge>
                        <Badge bg="info" text="dark">
                          👁 {p.viewsCount ?? 0}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Link>
                  <Card.Footer className="bg-white border-0 d-flex justify-content-between">
                    <Link to={`/edit-property/${p._id}`} className="btn btn-sm btn-primary rounded-pill">
                      Edit
                    </Link>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="rounded-pill"
                      onClick={() => handleDelete(p._id)}
                    >
                      Delete
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Container>
    </div>
  );
}
