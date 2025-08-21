// src/pages/Favorites.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Button, Card, Row, Col, Badge } from 'react-bootstrap';

/* -------- helpers (images) -------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

function normalizeUploadPath(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const clean = src.replace(/^\/+/, '');
  const rel = clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
  return `${API_ORIGIN}${rel}`;
}

const currency = (n) =>
  typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n ?? '';

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const pageGradient = useMemo(
    () => ({
      minHeight: '100vh',
      background:
        'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
    }),
    []
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getFavorites(token);
        if (!mounted) return;
        setFavorites(Array.isArray(data) ? data.filter((f) => f?.propertyId) : []);
      } catch (e) {
        console.error('Error fetching favorites:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const handleRemoveFavorite = async (propertyId) => {
    const ok = window.confirm('Remove this property from your favorites?');
    if (!ok) return;
    try {
      await removeFavorite(propertyId, token);
      setFavorites((prev) => prev.filter((f) => f.propertyId?._id !== propertyId));
    } catch (e) {
      console.error('Error removing favorite:', e);
      alert('Failed to remove from favorites.');
    }
  };

  return (
    <div style={pageGradient}>
      <Container className="py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center gap-2">
            <h3 className="fw-bold mb-0">Your Favorites</h3>
            {!loading && (
              <Badge bg="primary" pill>
                {favorites.length}
              </Badge>
            )}
          </div>
          <Button
            variant="outline-secondary"
            className="rounded-pill px-4"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to dashboard
          </Button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center text-muted py-5">Loading your favorite properties…</div>
        )}

        {/* Empty */}
        {!loading && favorites.length === 0 && (
          <div className="text-center py-5">
            <div
              className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: 72,
                height: 72,
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                fontSize: 28,
              }}
            >
              ⭐
            </div>
            <h5 className="fw-semibold mb-1">No favorites yet</h5>
            <p className="text-muted mb-3">Tap the star on any property to save it here.</p>
            <Button
              onClick={() => navigate('/dashboard')}
              className="rounded-pill px-4"
              style={{ background: 'linear-gradient(135deg,#ff0000,#ffeb3b)', border: 'none' }}
            >
              Browse Properties
            </Button>
          </div>
        )}

        {/* Grid */}
        {!loading && favorites.length > 0 && (
          <Row className="g-4">
            {favorites.map((fav) => {
              const p = fav.propertyId;
              const img =
                (p.images?.[0] && normalizeUploadPath(p.images[0])) ||
                'https://via.placeholder.com/600x360?text=No+Image';
              return (
                <Col md={6} lg={4} key={p._id}>
                  <Card className="h-100 shadow-sm border-0">
                    <Link
                      to={`/property/${p._id}`}
                      className="text-decoration-none text-dark"
                      aria-label={`Open ${p.title}`}
                    >
                      <div
                        className="ratio ratio-16x9 rounded-top"
                        style={{
                          backgroundImage: `url(${img})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <Card.Body>
                        <Card.Title className="mb-1">{p.title}</Card.Title>
                        <div className="text-muted small">📍 {p.location}</div>

                        <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                          {p.price != null && (
                            <Badge bg="light" text="dark">
                              💶 {currency(p.price)} €
                            </Badge>
                          )}
                          {p.type && (
                            <Badge
                              bg="primary"
                              title="Type"
                              style={{ background: 'linear-gradient(135deg,#ff0000,#ffeb3b)' }}
                            >
                              {p.type}
                            </Badge>
                          )}
                          {(p.bedrooms ?? 0) > 0 && (
                            <Badge bg="light" text="dark" title="Bedrooms">
                              🛏 {p.bedrooms}
                            </Badge>
                          )}
                          {(p.bathrooms ?? 0) > 0 && (
                            <Badge bg="light" text="dark" title="Bathrooms">
                              🛁 {p.bathrooms}
                            </Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Link>

                    <Card.Footer className="bg-white border-0 d-flex justify-content-between">
                      <Link
                        to={`/property/${p._id}`}
                        className="btn btn-sm btn-outline-primary rounded-pill"
                      >
                        View
                      </Link>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-pill"
                        onClick={() => handleRemoveFavorite(p._id)}
                        title="Remove from favorites"
                      >
                        Remove
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </div>
  );
}
