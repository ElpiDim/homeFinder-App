import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Modal, Button, Form } from 'react-bootstrap';
import GoogleMapView from '../components/GoogleMapView';

function PropertyDetails() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [property, setProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isFavorite, setIsFavorite] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');

  // Gallery
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const token = localStorage.getItem('token');

  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  const baseUrl = 'http://localhost:5000';
  const getImageUrl = (path) => {
    if (!path) return 'https://placehold.co/1200x800?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    let mounted = true;

    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${propertyId}`);
        if (mounted) {
          setProperty(res.data);
          setCurrentImageIndex(0);
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };

    const checkFavorite = async () => {
      try {
        const res = await api.get('/favorites', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fav = res.data.find((f) => f.propertyId?._id === propertyId);
        if (mounted) setIsFavorite(!!fav);
      } catch (err) {
        console.error('Error fetching favorites:', err);
      }
    };

    fetchProperty();
    if (user && token) checkFavorite();

    return () => {
      mounted = false;
    };
  }, [propertyId, user, token]);

  const handleFavorite = async () => {
    try {
      if (!isFavorite) {
        await api.post(
          '/favorites',
          { propertyId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setIsFavorite(true);
      } else {
        await api.delete(`/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
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
      await api.post(
        '/interests',
        { propertyId, message: interestMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      await api.delete(`/properties/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting property:', err);
    }
  };

  // Gallery helpers
  const openGalleryAt = (idx) => { setGalleryIndex(idx); setShowGallery(true); };
  const closeGallery = () => setShowGallery(false);
  const nextImage = () => {
    if (!property?.images?.length) return;
    setGalleryIndex((prev) => (prev + 1) % property.images.length);
  };
  const prevImage = () => {
    if (!property?.images?.length) return;
    setGalleryIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  // Keyboard nav for gallery
  useEffect(() => {
    if (!showGallery) return;
    const handler = (e) => {
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') closeGallery();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGallery, property?.images?.length]);

  if (!property) {
    return (
      <div style={pageGradient}>
        <div className="container py-5">Loading...</div>
      </div>
    );
  }

  const isOwner =
    user?.role === 'owner' &&
    (user?.id === property?.ownerId?._id || user?.id === property?.ownerId);

  const imgs = property.images || [];
  const hasCoords =
    property.latitude != null &&
    property.longitude != null &&
    !Number.isNaN(Number(property.latitude)) &&
    !Number.isNaN(Number(property.longitude));

  const mapCenter = hasCoords
    ? { lat: Number(property.latitude), lng: Number(property.longitude) }
    : { lat: 37.9838, lng: 23.7275 }; // Athens fallback

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

        {/* Main image */}
        <div className="position-relative">
          <img
            src={
              imgs[currentImageIndex]
                ? getImageUrl(imgs[currentImageIndex])
                : 'https://placehold.co/800x400?text=No+Image'
            }
            alt={property.title}
            className="img-fluid rounded mb-3"
            style={{
              maxHeight: '420px',
              objectFit: 'cover',
              width: '100%',
              cursor: imgs.length ? 'zoom-in' : 'default',
            }}
            onClick={() => imgs.length && openGalleryAt(currentImageIndex)}
          />

          {imgs.length > 1 && (
            <div className="d-flex justify-content-between mb-3">
              <Button
                variant="light"
                onClick={() =>
                  setCurrentImageIndex((prev) => (prev === 0 ? imgs.length - 1 : prev - 1))
                }
              >
                ◀
              </Button>
              <Button
                variant="light"
                onClick={() =>
                  setCurrentImageIndex((prev) => (prev === imgs.length - 1 ? 0 : prev + 1))
                }
              >
                ▶
              </Button>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imgs.length > 1 && (
          <div className="d-flex flex-wrap gap-2 mb-4">
            {imgs.map((src, i) => (
              <button
                key={i}
                type="button"
                className="p-0 border-0 bg-transparent"
                onClick={() => { setCurrentImageIndex(i); openGalleryAt(i); }}
                title={`Image ${i + 1}`}
              >
                <img
                  src={getImageUrl(src)}
                  alt={`Thumbnail ${i + 1}`}
                  style={{
                    width: 96,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 6,
                    outline: i === currentImageIndex ? '2px solid #0d6efd' : '1px solid #e5e7eb',
                  }}
                />
              </button>
            ))}
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
            <Button variant={isFavorite ? 'warning' : 'outline-warning'} onClick={handleFavorite}>
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

        {/* Always render the map (fallback center). Marker only if coords exist. */}
        <div className="mb-4">
          <h5 className="fw-bold">Location on Map</h5>
          <GoogleMapView
            properties={hasCoords ? [property] : []}
            height="300px"
            useClustering={false}
            showSearch={false}   // make sure your GoogleMapView respects this
            defaultCenter={mapCenter}
            zoom={hasCoords ? 14 : 11}
          />
          {!hasCoords && (
            <div className="small text-muted mt-2">
              No saved pin for this property. Add one via “Edit Property”.
            </div>
          )}
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
            <Button variant="primary" onClick={() => navigate(`/edit-property/${propertyId}`)}>
              Edit
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      <Modal show={showGallery} onHide={closeGallery} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Gallery ({property.images?.length ? galleryIndex + 1 : 0}/{property.images?.length || 0})</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src={
              property.images?.length
                ? getImageUrl(property.images[galleryIndex])
                : 'https://placehold.co/1200x800?text=No+Image'
            }
            alt={`Image ${galleryIndex + 1}`}
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
          />
        </Modal.Body>
        {property.images?.length > 1 && (
          <Modal.Footer className="d-flex justify-content-between">
            <Button variant="light" onClick={prevImage}>◀ Prev</Button>
            <Button variant="light" onClick={nextImage}>Next ▶</Button>
          </Modal.Footer>
        )}
      </Modal>

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
            <Button variant="secondary" onClick={() => setShowInterestModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Send Interest</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default PropertyDetails;
