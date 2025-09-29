// src/pages/Properties.js
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api'; // axios instance (baseURL = /api + Authorization)

const Properties = () => {
  const { user } = useAuth();               //hook μέσα στο component
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const run = async () => {
      try {
        // αν δεν υπάρχει user ή preferences, μην καλείς API
        if (!user || !user.preferences) {
          setProperties([]);
          return;
        }

        // φτιάχνουμε query από τα preferences
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

  const imgUrl = (src) =>
    src
      ? (src.startsWith('http') ? src : `http://localhost:5000${src}`)
      : 'https://via.placeholder.com/600x360?text=No+Image';

  return (
    <div className="container mt-4">
      <div className="row">
        {properties.map((prop) => (
          <div className="col-md-4 mb-4" key={prop._id}>
            <div className="card h-100">
              <img
                src={imgUrl(prop.images?.[0])}
                className="card-img-top"
                alt={prop.title || 'Property'}
                style={{ objectFit: 'cover', height: 200 }}
              />
              <div className="card-body">
                <h5 className="card-title">{prop.title}</h5>
                <p className="card-text">{prop.location}</p>
              </div>
              <div className="card-footer d-flex justify-content-between">
                <small className="text-muted">{prop.type}</small>
                <small className="text-muted">
                  €{Number(prop.rent ?? 0).toLocaleString()}
                </small>
              </div>
            </div>
          </div>
        ))}

        {/* Αν δεν υπάρχουν αποτελέσματα, απλά μην δείχνεις τίποτα (όπως ζήτησες) */}
        {properties.length === 0 && (
          <div className="col-12 text-muted small"> </div>
        )}
      </div>
    </div>
  );
};

export default Properties;
