// src/pages/Properties.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function Properties() {
  const [properties, setProperties] = useState([]);

  // Pastel gradient (same as other pages)
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #006400 0%, #228b22 33%, #32cd32 66%, #90ee90 100%)',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/properties');
        setProperties(res.data);
      } catch (err) {
        console.error('Error fetching properties', err);
      }
    };

    fetchData();
  }, []);

  const imgUrl = (src) =>
    src
      ? src.startsWith('http')
        ? src
        : `http://localhost:5000${src}`
      : 'https://via.placeholder.com/400x200?text=No+Image';

  return (
    <div style={pageGradient}>
      <div className="container py-5">
        <h2 className="fw-bold mb-4">Available Properties</h2>

        {properties.length === 0 ? (
          <p className="text-muted">No properties found.</p>
        ) : (
          <div className="row g-4">
            {properties.map((prop) => (
              <div className="col-md-4" key={prop._id}>
                <div className="card border-0 shadow-sm h-100">
                  <div
                    className="rounded-top"
                    style={{
                      backgroundImage: `url(${imgUrl(prop.images?.[0])})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      height: '200px',
                    }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-semibold">{prop.title}</h5>
                    <p className="text-muted mb-1">📍 {prop.location}</p>
                    <p className="text-muted mb-1">
                      💶 {Number(prop.price).toLocaleString()} €
                    </p>
                    {prop.type && (
                      <p className="text-muted mb-3">🏷️ {prop.type}</p>
                    )}
                    <div className="mt-auto">
                      <Link
                        to={`/property/${prop._id}`}
                        className="btn btn-primary rounded-pill px-4"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Properties;
