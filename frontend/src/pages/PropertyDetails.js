import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 
import axios from 'axios';

// ... imports όπως πριν ...

function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await axios.get(`/api/properties/${propertyId}`);
        setProperty(res.data);
        setCurrentImageIndex(0);
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };

    fetchProperty();
  }, [propertyId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`/api/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting property:', err);
    }
  };

  if (!property) return <p>Loading...</p>;

  const isOwner = user?.role === 'owner' && (user?.id === property?.ownerId?._id || user?.id === property?.ownerId);

  return (
    <div className="container mt-4">
      <button className="btn btn-secondary mb-3" onClick={() => navigate("/dashboard")}>Back</button>

      <div className="card">
        {property.images?.length > 0 ? (
          <div className="position-relative text-center mb-4">
            <img
              src={property.images[currentImageIndex]}
              alt={`Image ${currentImageIndex + 1}`}
              className="img-fluid rounded"
              style={{ maxHeight: '400px', objectFit: 'cover' }}
            />
            {property.images.length > 1 && (
              <>
                <button
                  className="btn btn-light position-absolute top-50 start-0 translate-middle-y"
                  onClick={() =>
                    setCurrentImageIndex(prev => prev === 0 ? property.images.length - 1 : prev - 1)
                  }
                >◀</button>
                <button
                  className="btn btn-light position-absolute top-50 end-0 translate-middle-y"
                  onClick={() =>
                    setCurrentImageIndex(prev => prev === property.images.length - 1 ? 0 : prev + 1)
                  }
                >▶</button>
              </>
            )}
          </div>
        ) : <p className="text-muted text-center">No images available.</p>}

        <div className="card-body">
          <h3>{property.title}</h3>
          <p><strong>Location:</strong> {property.location}</p>
          <p><strong>Price:</strong> €{property.price}</p>
          <p><strong>Type:</strong> {property.type}</p>
          <p><strong>Status:</strong> {property.status}</p>
          <hr />
          <p><strong>Square Meters:</strong> {property.squareMeters} m²</p>
          <p><strong>Surface:</strong> {property.surface} m²</p>
          <p><strong>Floor:</strong> {property.floor}</p>
          <p><strong>On Top Floor:</strong> {property.onTopFloor ? 'Yes' : 'No'}</p>
          <p><strong>Levels:</strong> {property.levels}</p>
          <hr />
          <p><strong>Bedrooms:</strong> {property.bedrooms}</p>
          <p><strong>Bathrooms:</strong> {property.bathrooms}</p>
          <p><strong>WC:</strong> {property.wc}</p>
          <p><strong>Kitchens:</strong> {property.kitchens}</p>
          <p><strong>Living Rooms:</strong> {property.livingRooms}</p>
          <hr />
          {property.features?.length > 0 && (
            <>
              <p><strong>Features:</strong></p>
              <ul className="text-start">
                {property.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </>
          )}

          {isOwner && (
            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={() => navigate(`/edit-property/${propertyId}`)}>Edit</button>
              <button className="btn btn-danger" onClick={handleDelete}>🗑️</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;
