import React, { useEffect, useState } from 'react';
import api from '../api';
import PropertyCard from '../components/propertyCard';

function MatchProperties() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get('/match/properties', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = Array.isArray(res.data) ? res.data : [];
        setProperties(data);
      } catch (err) {
        console.error('Failed to fetch property matches', err);
        setProperties([]);
      }
    };

    fetchProperties();
  }, []);

  const imgUrl = (src) =>
    src ? (src.startsWith('http') ? src : `http://localhost:5000${src}`) : '';

  return (
    <div className="container mt-4">
      <h3>Suggested Homes</h3>
      <div className="row g-3">
        {properties.map((prop) => (
          <div className="col-md-4" key={prop._id}>
            <PropertyCard prop={prop} imgUrl={imgUrl} />
          </div>
        ))}
        {properties.length === 0 && (
          <p className="text-muted">No matches found.</p>
        )}
      </div>
    </div>
  );
}

export default MatchProperties;
