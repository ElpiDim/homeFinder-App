// src/pages/PropertyDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { Modal, Button, Form, Badge } from 'react-bootstrap';
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

  // default prefilled message for "I'm Interested"
  const getDefaultInterestMsg = () => {
    const name = user?.name ? `Hi, I'm ${user.name}` : 'Hi';
    const title = property?.title ? ` “${property.title}”` : '';
    const area = property?.address || property?.location || '';
    const where = area ? ` (${area})` : '';
    return `${name}. I'm interested in your property${title}${where}.
Could we schedule a viewing? Thanks!`;
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
        const fav = res.data.find((f) => (f.propertyId?._id || f.propertyId) === propertyId);
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
    (user?.id === (property?.ownerId?._id || property?.ownerId));

  const imgs = property.images || [];
  const hasCoords =
    property.latitude != null &&
    property.longitude != null &&
    !Number.isNaN(Number(property.latitude)) &&
    !Number.isNaN(Number(property.longitude));

  const mapCenter = hasCoords
    ? { lat: Number(property.latitude), lng: Number(property.longitude) }
    : { lat: 37.9838, lng: 23.7275 }; // Athens fallback

  // helpers for UI
  const money = (n) =>
    typeof n === 'number' && !Number.isNaN(n)
      ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : n ?? '—';

  const boolTick = (v) => (v ? 'Yes' : 'No');

  const areaForPpsm = Number(property.squareMeters || property.surface || 0);
  const pricePerSqm =
    areaForPpsm > 0 && property.price != null
      ? Math.round(Number(property.price) / areaForPpsm)
      : null;

  const featureChips = (arr) =>
    (arr || []).map((f, i) => (
      <span key={i} className="badge bg-light text-dark border me-2 mb-2">{f}</span>
    ));

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '1000px' }}>
        <Button
          variant="outline-secondary"
          className="rounded-pill px-3 mb-3"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to search
        </Button>

        {/* Header row: Title + Badges + Favorite / Interest */}
        <div className="d-flex align-items-start justify-content-between flex-wrap gap-2">
          <div>
            <h3 className="fw-bold mb-1">{property.title}</h3>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge bg={property.type === 'rent' ? 'info' : 'primary'}>{property.type}</Badge>
              <Badge bg={
                property.status === 'available' ? 'success' :
                property.status === 'sold' ? 'secondary' : 'warning'
              }>
                {property.status}
              </Badge>
              {property.energyClass && <Badge bg="dark">Energy {property.energyClass}</Badge>}
              {property.yearBuilt ? <Badge bg="light" text="dark">Year {property.yearBuilt}</Badge> : null}
            </div>
            <div className="text-muted mt-2">
              <span>📍 {property.address || property.location}</span>
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <Button
              variant={isFavorite ? 'warning' : 'outline-warning'}
              className="rounded-pill px-4"
              onClick={handleFavorite}
            >
              {isFavorite ? '★ Favorited' : '☆ Add to Favorites'}
            </Button>
            {!isOwner && user?.role === 'client' && (
              <Button
                variant="primary"
                className="rounded-pill px-4"
                onClick={() => {
                  setInterestMessage((prev) =>
                    prev && prev.trim().length > 0 ? prev : getDefaultInterestMsg()
                  );
                  setShowInterestModal(true);
                }}
              >
                👋 I'm Interested
              </Button>
            )}
          </div>
        </div>

        {/* Price block */}
        <div className="mt-3 p-3 rounded-3 border bg-light d-flex align-items-center justify-content-between flex-wrap">
          <div className="fs-4 fw-bold">€ {money(property.price)}</div>
          <div className="text-muted">
            {property.squareMeters ? `${property.squareMeters} m²` : property.surface ? `${property.surface} m²` : '—'}
            {pricePerSqm ? <> · <strong>€{money(pricePerSqm)}/m²</strong></> : null}
          </div>
        </div>

        {/* Main image */}
        <div className="position-relative mt-3">
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
              <Button variant="light" className="rounded-pill px-3"
                onClick={() =>
                  setCurrentImageIndex((prev) => (prev === 0 ? imgs.length - 1 : prev - 1))
                }
              >
                ◀
              </Button>
              <Button variant="light" className="rounded-pill px-3"
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
                    borderRadius: 8,
                    outline: i === currentImageIndex ? '2px solid #0d6efd' : '1px solid #e5e7eb',
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <>
            <h5 className="fw-bold">Description</h5>
            <p className="mt-2">{property.description}</p>
            <hr />
          </>
        )}

        {/* Map */}
        <div className="mb-4">
          <h5 className="fw-bold">Location on Map</h5>
          <GoogleMapView
            properties={hasCoords ? [property] : []}
            height="300px"
            useClustering={false}
            showSearch={false}
            defaultCenter={mapCenter}
            zoom={hasCoords ? 14 : 11}
          />
          {!hasCoords && (
            <div className="small text-muted mt-2">
              No saved pin for this property. Add one via “Edit Property”.
            </div>
          )}
        </div>

        {/* Facts & Features */}
        <hr />
        <h5 className="fw-bold">Facts & features</h5>

        <div className="row row-cols-1 row-cols-md-2 g-2 mt-1">
          <div className="col"><strong>Type:</strong> {property.type}</div>
          <div className="col"><strong>Status:</strong> {property.status}</div>
          <div className="col"><strong>Floor:</strong> {property.floor ?? '—'}</div>
          <div className="col"><strong>Top Floor:</strong> {boolTick(property.onTopFloor)}</div>
          <div className="col"><strong>Levels:</strong> {property.levels ?? '—'}</div>
          <div className="col"><strong>Square Meters:</strong> {property.squareMeters ?? property.surface ?? '—'} m²</div>
          <div className="col"><strong>Bedrooms:</strong> {property.bedrooms ?? 0}</div>
          <div className="col"><strong>Bathrooms:</strong> {property.bathrooms ?? 0}</div>
          <div className="col"><strong>WC:</strong> {property.wc ?? 0}</div>
          <div className="col"><strong>Kitchens:</strong> {property.kitchens ?? 0}</div>
          <div className="col"><strong>Living Rooms:</strong> {property.livingRooms ?? 0}</div>
          <div className="col"><strong>Parking Spaces:</strong> {property.parkingSpaces ?? 0}</div>
          <div className="col"><strong>Monthly Fee:</strong> {property.monthlyMaintenanceFee != null ? `€${money(property.monthlyMaintenanceFee)}` : '—'}</div>
          <div className="col"><strong>Year Built:</strong> {property.yearBuilt ?? '—'}</div>
          <div className="col"><strong>Condition:</strong> {property.condition || '—'}</div>
          <div className="col"><strong>Heating:</strong> {property.heating || '—'}</div>
          <div className="col"><strong>Energy Class:</strong> {property.energyClass || '—'}</div>
          <div className="col"><strong>Orientation:</strong> {property.orientation || '—'}</div>
          <div className="col"><strong>View:</strong> {property.view || '—'}</div>
          <div className="col"><strong>Plot Size:</strong> {property.plotSize ? `${property.plotSize} m²` : '—'}</div>
          <div className="col"><strong>Furnished:</strong> {boolTick(property.furnished)}</div>
          <div className="col"><strong>Pets Allowed:</strong> {boolTick(property.petsAllowed)}</div>
          <div className="col"><strong>Smoking Allowed:</strong> {boolTick(property.smokingAllowed)}</div>
          <div className="col"><strong>Elevator:</strong> {boolTick(property.hasElevator)}</div>
          <div className="col"><strong>Storage:</strong> {boolTick(property.hasStorage)}</div>
          <div className="col"><strong>Insulation:</strong> {boolTick(property.insulation)}</div>
        </div>

        {/* Feature tags */}
        {Array.isArray(property.features) && property.features.length > 0 && (
          <>
            <h6 className="fw-bold mt-3">Features</h6>
            <div className="d-flex flex-wrap mt-1">
              {featureChips(property.features)}
            </div>
          </>
        )}

        {/* Floor Plan */}
        {property.floorPlanImage && (
          <>
            <hr />
            <h5 className="fw-bold">Floor plan</h5>
            <div className="mt-2">
              <img
                src={getImageUrl(property.floorPlanImage)}
                alt="Floor plan"
                style={{ width: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }}
                onClick={() => window.open(getImageUrl(property.floorPlanImage), '_blank')}
              />
              <div className="small text-muted mt-1">
                Click the image to open it full size.
              </div>
            </div>
          </>
        )}

        {/* Owner Notes (private – only to owner) */}
        {isOwner && property.ownerNotes && (
          <>
            <hr />
            <div className="alert alert-secondary">
              <strong>Owner Notes:</strong> {property.ownerNotes}
            </div>
          </>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="mt-4 d-flex gap-2">
            <Button
              variant="primary"
              className="rounded-pill px-4"
              onClick={() => navigate(`/edit-property/${propertyId}`)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              className="rounded-pill px-4"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Gallery Modal */}
      <Modal show={showGallery} onHide={closeGallery} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Gallery ({property.images?.length ? galleryIndex + 1 : 0}/{property.images?.length || 0})
          </Modal.Title>
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
            <Button variant="light" className="rounded-pill px-4" onClick={prevImage}>◀ Prev</Button>
            <Button variant="light" className="rounded-pill px-4" onClick={nextImage}>Next ▶</Button>
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
              <Form.Text className="text-muted">
                You can personalize this message before sending.
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              className="rounded-pill px-4"
              onClick={() => setShowInterestModal(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="rounded-pill px-4">
              Send Interest
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default PropertyDetails;
