import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Properties() {
  const [properties, setProperties] = useState([]);

  // Pastel gradient (same as other pages)
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/properties');
        setProperties(res.data);
      } catch (err) {
        console.error('Error fetching properties', err);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={pageGradient}>
      <div className="container mt-4">
        <h2>Available Properties</h2>
        {properties.length === 0 ? (
          <p>No properties found.</p>
        ) : (
          <ul>
            {properties.map((prop) => (
              <li key={prop._id}>
                <strong>{prop.title}</strong> - {prop.location} - €{prop.price}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Properties;
