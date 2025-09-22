// src/pages/Properties.js
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import PropertyCard from '../components/propertyCard';
import api from '../api';

const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

const normalizeUploadPath = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const clean = src.replace(/^\/+/, '');
  const rel = clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
  return `${API_ORIGIN}${rel}`;
};

const imgUrl = (src) =>
  src
    ? (src.startsWith('http') ? src : normalizeUploadPath(src))
    : 'https://via.placeholder.com/600x360?text=No+Image';

const Properties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!user || !user.preferences) {
          setProperties([]);
          return;
        }

        const params = new URLSearchParams();
        Object.entries(user.preferences).forEach(([k, v]) => {
          if (v !== undefined && v !== null && `${v}` !== '') params.set(k, v);
        });

        const res = await api.get(`/properties?${params.toString()}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setProperties(data);
      } catch (err) {
        console.error('Failed to fetch properties', err);
        setProperties([]);
      }
    };

    run();
  }, [user]);

  return (
    <AppShell
      container="xl"
      hero={
        <div className="surface-section">
          <div className="d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
            <div>
              <p className="text-uppercase text-muted small mb-1">Tailored suggestions</p>
              <h1 className="fw-bold mb-2">Properties matched to your profile</h1>
              <p className="text-muted mb-0" style={{ maxWidth: 560 }}>
                These results use your onboarding preferences. Update your filters in the profile page for even smarter matches.
              </p>
            </div>
            <Link to="/dashboard" className="btn btn-brand-outline">Back to dashboard</Link>
          </div>
        </div>
      }
    >
      <section className="surface-card">
        {(!Array.isArray(properties) || properties.length === 0) && (
          <div className="text-center text-muted py-5">
            No matching properties yet. Adjust your criteria or explore the latest offers from the dashboard.
          </div>
        )}

        {Array.isArray(properties) && properties.length > 0 && (
          <div className="row g-4">
            {properties.map((prop) => (
              <div className="col-sm-6 col-lg-4" key={prop._id}>
                <PropertyCard
                  prop={prop}
                  isFavorite={false}
                  onToggleFavorite={() => {}}
                  imgUrl={imgUrl}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
};

export default Properties;
