// src/pages/Favorites.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import PropertyCard from '../components/propertyCard';

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
  const token = localStorage.getItem('token');

  const heroStats = useMemo(() => ({
    total: favorites.length,
    name: user?.name || 'there',
  }), [favorites.length, user?.name]);

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

  const hero = (
    <div className="surface-section">
      <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
        <div>
          <p className="text-uppercase text-muted small mb-1">Saved homes</p>
          <h1 className="fw-bold mb-2">Hi {heroStats.name}, here are your favorites</h1>
          <p className="text-muted mb-0">Revisit the properties you love and keep track of price or availability changes.</p>
        </div>
        <span className="pill">{heroStats.total} saved</span>
      </div>
    </div>
  );

  return (
    <AppShell
      container="xl"
      hero={hero}
      navRight={
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Link to="/dashboard" className="btn btn-brand-outline">Back to dashboard</Link>
          <Link to="/messages" className="btn btn-soft">Messages</Link>
        </div>
      }
    >
      <section className="surface-card">
        {loading && <div className="text-center text-muted py-5">Loading your favorite properties…</div>}

        {!loading && favorites.length === 0 && (
          <div className="text-center py-5">
            <div className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center shadow-soft"
              style={{ width: 72, height: 72, background: 'rgba(53,176,102,0.14)', fontSize: 28 }}>
              ⭐
            </div>
            <h5 className="fw-semibold mb-1">No favorites yet</h5>
            <p className="text-muted mb-3">Tap the star on any property to save it here.</p>
            <Link to="/dashboard" className="btn btn-brand px-4">Browse properties</Link>
          </div>
        )}

        {!loading && favorites.length > 0 && (
          <div className="row g-4">
            {favorites.map((fav) => {
              const p = fav.propertyId;
              const img = (p.images?.[0] && normalizeUploadPath(p.images[0])) ||
                'https://via.placeholder.com/600x360?text=No+Image';
              return (
                <div className="col-sm-6 col-lg-4" key={p._id}>
                  <div className="surface-card surface-card--flat h-100 d-flex flex-column gap-3">
                    <PropertyCard
                      prop={{ ...p, images: [img] }}
                      isFavorite
                      onToggleFavorite={() => handleRemoveFavorite(p._id)}
                      imgUrl={() => img}
                    />
                    <div className="d-flex justify-content-between align-items-center">
                      <Link to={`/property/${p._id}`} className="btn btn-brand-outline">View details</Link>
                      <button
                        type="button"
                        className="btn btn-soft"
                        onClick={() => handleRemoveFavorite(p._id)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2 small text-muted">
                      {p.price != null && <span className="pill">💶 {currency(p.price)} €</span>}
                      {p.type && <span className="pill text-capitalize">{p.type}</span>}
                      {p.bedrooms != null && <span className="pill">🛏 {p.bedrooms}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
