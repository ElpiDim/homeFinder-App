import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Modal, Button, Form } from 'react-bootstrap';

function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [property, setProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');

  const token = localStorage.getItem('token');

  // Pastel gradient (same as other pages)
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

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

    const checkFavorite = async () => {
      try {
        const res = await axios.get('/api/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const fav = res.data.find(f => f.propertyId?._id === propertyId);
        setIsFavorite(!!fav);
      } catch (err) {
        console.error('Error fetching favorites:', err);
      }
    };

    fetchProperty();
    if (user) checkFavorite();
  }, [propertyId, user]);

  const handleFavorite = async () => {
    try {
      if (!isFavorite) {
        await axios.post('/api/favorites', { propertyId }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
      } else {
        await axios.delete(`/api/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleInterestSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/interests', {
        propertyId,
        message: interestMessage,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowInterestModal(false);
      alert('Your interest has been sent to the owner!');
    } catch (err) {
      console.error('Error sending interest:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to send interest.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this property?')) return;
    try {
      await axios.delete(`/api/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting property:', err);
    }
  };

  if (!property) {
    return (
      <div style={pageGradient}>
        <p className="text-center pt-5">Loading...</p>
      </div>
    );
  }

  const isOwner = user?.role === 'owner' && (user?.id === property?.ownerId?._id || user?.id === property?.ownerId);

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '900px' }}>
        <Button
          variant="link"
          className="text-decoration-none px-0 mb-3"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to search
        </Button>

        <img
          src={property.images?.[currentImageIndex]
            ? `http://localhost:5000${property.images[currentImageIndex]}`
            : "https://placehold.co/800x400?text=No+Image"}
          alt={property.title}
          className="img-fluid rounded mb-4"
          style={{ maxHeight: '400px', objectFit: 'cover', width: '100%' }}
        />

        {property.images?.length > 1 && (
          <div className="d-flex justify-content-between mb-4">
            <Button variant="light" onClick={() =>
              setCurrentImageIndex((prev) => prev === 0 ? property.images.length - 1 : prev - 1)
            }>◀</Button>
            <Button variant="light" onClick={() =>
              setCurrentImageIndex((prev) => prev === property.images.length - 1 ? 0 : prev + 1)
            }>▶</Button>
          </div>
        )}

        <div className="d-flex justify-content-between flex-wrap">
          <div>
            <h3 className="fw-bold">{property.title}</h3>
            <p className="text-muted">
              {property.bedrooms} beds · {property.bathrooms} baths · {property.squareMeters || 0} m²
            </p>
            <p><strong>Location:</strong> {property.location}</p>
            <p><strong>Type:</strong> {property.type}</p>
            <p><strong>Price:</strong> €{property.price}</p>
          </div>

          <div className="d-flex flex-column gap-2">
            <Button variant={isFavorite ? "warning" : "outline-warning"} onClick={handleFavorite}>
              {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
            </Button>
            {!isOwner && user?.role === 'client' && (
              <Button variant="primary" onClick={() => setShowInterestModal(true)}>
                👋 I'm Interested
              </Button>
            )}
          </div>
        </div>

        <hr />
        <h5 className="fw-bold">Facts and features</h5>
        <div className="row row-cols-2">
          <div className="col"><strong>Floor:</strong> {property.floor}</div>
          <div className="col"><strong>Top Floor:</strong> {property.onTopFloor ? 'Yes' : 'No'}</div>
          <div className="col"><strong>Levels:</strong> {property.levels}</div>
          <div className="col"><strong>Surface:</strong> {property.surface} m²</div>
          <div className="col"><strong>WC:</strong> {property.wc}</div>
          <div className="col"><strong>Kitchens:</strong> {property.kitchens}</div>
          <div className="col"><strong>Living Rooms:</strong> {property.livingRooms}</div>
        </div>

        {property.features?.length > 0 && (
          <>
            <hr />
            <h6 className="fw-bold">Features</h6>
            <ul>
              {property.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </>
        )}

        {isOwner && (
          <div className="mt-4 d-flex gap-2">
            <Button variant="primary" onClick={() => navigate(`/edit-property/${propertyId}`)}>Edit</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        )}
      </div>

      {/* Interest Modal */}
      <Modal show={showInterestModal} onHide={() => setShowInterestModal(false)}>
        <Form onSubmit={handleInterestSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>I'm Interested</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Your message to the owner</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                required
                value={interestMessage}
                onChange={(e) => setInterestMessage(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowInterestModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send Interest
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default PropertyDetails;
