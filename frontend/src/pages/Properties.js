import { useEffect, useState } from 'react';
import UseAuth from '../hooks/UseAuth';

const Properties = () => {
  const { user } = UseAuth();
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (!user?.preferences) return;
    const params = new URLSearchParams(user.preferences).toString();

    fetch(`/api/properties?${params}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProperties(data);
        } else {
          setProperties([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch properties', err);
      });
  }, [user]);

  return (
    <div className="container mt-4">
      <div className="row">
        {properties.map(prop => (
          <div className="col-md-4 mb-4" key={prop.id}>
            <div className="card h-100">
              {prop.image && (
                <img src={prop.image} className="card-img-top" alt={prop.title} />
              )}
              <div className="card-body">
                <h5 className="card-title">{prop.title}</h5>
                <p className="card-text">{prop.location}</p>
              </div>
              <div className="card-footer">
                <small className="text-muted">
                  {prop.type} · ${'{'}prop.price{'}'}
                </small>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Properties;