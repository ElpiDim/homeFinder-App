import React, { useEffect, useState } from 'react';
import api from '../api';
import PropertyCard from '../components/propertyCard';
import { useAuth } from '../context/AuthContext';

function MatchProperties() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/properties/matches/${user._id}`);
        setMatches(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Failed to fetch property matches', err);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  const imgUrl = (src) =>
    src ? (src.startsWith('http') ? src : `http://localhost:5000${src}`) : '';

  return (
    <div className="container mt-4">
      <h3>Your Property Matches</h3>
      {loading ? (
        <p>Loading matches...</p>
      ) : (
        <div className="row g-3">
          {matches.map(({ property, propertyMatchScore, tenantMatchScore }) => (
            <div className="col-md-4" key={property._id}>
              <PropertyCard prop={property} imgUrl={imgUrl}>
                <div className="mt-2">
                  <p className="mb-0">Property Match Score: {propertyMatchScore}</p>
                  <p className="mb-0">Tenant Match Score: {tenantMatchScore}</p>
                </div>
              </PropertyCard>
            </div>
          ))}
          {matches.length === 0 && (
            <p className="text-muted">No matches found. Try adjusting your profile and preferences.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchProperties;
