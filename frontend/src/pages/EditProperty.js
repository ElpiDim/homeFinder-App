// src/pages/EditProperty.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  StandaloneSearchBox,
} from '@react-google-maps/api';

const containerStyle = { width: '100%', height: '320px' };
const LIBRARIES = ['places'];
const LOADER_ID = 'gmap';

// ✅ CRA-friendly: παίρνουμε το key από REACT_APP_*
function getMapsApiKey() {
  return (
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  );
}

const featureOptions = [
  'Parking spot',
  'Elevator',
  'Secure door',
  'Alarm',
  'Furnished',
  'Storage space',
  'Fireplace',
  'Balcony',
  'Internal staircase',
  'Garden',
  'Swimming pool',
  'Playroom',
  'Attic',
  'View',
  'Solar water heating',
];

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  // files
  const [newImages, setNewImages] = useState([]);
  const [floorPlanImage, setFloorPlanImage] = useState(null);

  // existing
  const [existingImages, setExistingImages] = useState([]);
  const [existingFloorPlan, setExistingFloorPlan] = useState(null);

  // form
  const [formData, setFormData] = useState({
  
    title: '',
    location: '',
    address: '',
    price: '',
    type: 'sale',
    status: 'available',

    description: '',

   plotsize: '', 

    yearBuilt: '',
    ownerNotes: '',
    features: [],
    
  });
   const [requirements, setRequirements] = useState({});

  // ---- Google Maps ----
  const apiKey = getMapsApiKey();
  const { isLoaded } = useJsApiLoader(
    apiKey ? { id: LOADER_ID, googleMapsApiKey: apiKey, libraries: LIBRARIES }
           : { id: LOADER_ID }
  );
  const [map, setMap] = useState(null);
  const [latLng, setLatLng] = useState(null);
  const [center, setCenter] = useState({ lat: 37.9838, lng: 23.7275 }); // Athens

  const searchBoxRef = useRef(null);
  const onSearchLoad = (ref) => { searchBoxRef.current = ref; };
  const onPlacesChanged = () => {
    if (!map || !searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    const place = places && places[0];
    if (!place?.geometry?.location) return;

    const loc = place.geometry.location;
    const p = { lat: loc.lat(), lng: loc.lng() };
    setLatLng(p);
    setCenter(p);
    map.panTo(p);
    map.setZoom(Math.max(map.getZoom() || 0, 14));

    const addr = place.formatted_address ?? place.vicinity ?? place.name ?? formData.location;
    setFormData((prev) => ({ ...prev, location: addr, address: addr }));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      if (results && results[0]) {
        setFormData((prev) => ({
          ...prev,
          location: results[0].formatted_address,
          address: results[0].formatted_address,
        }));
      }
    } catch (e) {
      console.warn('Reverse geocode failed', e);
    }
  };

  const onMapClick = (e) => {
    const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setLatLng(p);
    setCenter(p);
    reverseGeocode(p.lat, p.lng);
  };

  // ---- Load property
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await api.get(`/properties/${propertyId}`);
        const p = res.data || {};

        setFormData({
          title: p.title || '',
          location: p.location || '',
          address: p.address || '',
          price: p.price ?? '',
          type: p.type || 'sale',
          status: p.status || 'available',
          description: p.description || '',
          squareMeters: p.squareMeters ?? '',
          plotSize: p.plotsize ?? '',
          yearBuilt: p.yearBuilt ?? '',
          ownerNotes: p.ownerNotes || '',
          features: Array.isArray(p.features) ? p.features : [],
        });
        if (Array.isArray(p.requirements)) {
          const reqs = p.requirements.reduce((acc, req) => {
            acc[req.name] = req.value;
            return acc;
          }, {});
          setRequirements(reqs);
        }


        setExistingImages(Array.isArray(p.images) ? p.images : []);
        setExistingFloorPlan(p.floorPlanImage || null);

        if (
          p.latitude != null &&
          p.longitude != null &&
          !Number.isNaN(Number(p.latitude)) &&
          !Number.isNaN(Number(p.longitude))
        ) {
          const pos = { lat: Number(p.latitude), lng: Number(p.longitude) };
          setLatLng(pos);
          setCenter(pos);
        }
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };
    fetchProperty();
  }, [propertyId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && name === 'features') {
      setFormData(prev => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter(f => f !== value)
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const data = new FormData();

    Object.entries(fromData).forEach(([k,v])=>{ 
      if (v !== undefined && v !== null && v !== '') data.append(k, v);
    });

    const reqsAsArray = Object.entries(requirements).map(([name, value]) => ({ name, value }));
    if (reqsAsArray.length > 0) {
      data.append('requirements', JSON.stringify(reqsAsArray));
    }
    // features
    if (formData.features && formData.features.length) {
      formData.features.forEach((f) => data.append('features[]', f));
    } else {

      data.append('features[]', '');
    }

    // geo
    if (latLng) {
      data.append('latitude', String(latLng.lat));
      data.append('longitude', String(latLng.lng));
    }

    // files
    newImages.forEach((img) => data.append('images', img));
    if (floorPlanImage) data.append('floorPlanImage', floorPlanImage);

    try {
      await api.put(`/properties/${propertyId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate(`/property/${propertyId}`);
    } catch (err) {
      console.error('❌ Error updating property:', err);
      alert(err.response?.data?.message || 'Update failed');
    }
  };

  // Helpers
  const getImageUrl = (path) =>
    !path ? '' : path.startsWith('http') ? path : `http://localhost:5000${path}`;

  // Pastel gradient
  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #006400 0%, #228b22 33%, #32cd32 66%, #90ee90 100%)',
  }), []);

  const noKey = !apiKey;

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '900px' }}>
        <h4 className="fw-bold mb-4">Edit Property</h4>

        {noKey && (
          <div className="alert alert-warning">
            Google Maps API key is missing. Πρόσθεσε στο <code>frontend/.env</code>:
            <br />
            <code>REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE</code>
            <br />
            και κάνε restart το <code>npm start</code>.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* CORE */}
          <div className="mb-3">
            <label className="form-label">Title</label>
            <input
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Location (displayed)</label>
            <input
              name="location"
              className="form-control"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Address</label>
            <input
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street, number, area"
            />
          </div>

          <div className="row g-3">
            <div className="col-sm-4">
              <label className="form-label">Price (€)</label>
              <input
                name="price"
                type="number"
                className="form-control"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="form-control">
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="form-control">
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="mb-3 mt-3">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="form-control"
              value={formData.description}
              onChange={handleChange}
              placeholder="A few highlights about the property..."
            />
          </div>

          
          <hr className="my-3" />
           <h5 className="fw-bold">Property Details</h5>
          <RequirementsForm values={requirements} setValues={setRequirements} />
          
          {/* FEATURE TAGS */}
          <h5 className="mt-4">Features</h5>
          <div className="d-flex flex-wrap gap-3">
            {featureOptions.map((feature) => (
              <div key={feature} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="features"
                  value={feature}
                  onChange={handleChange}
                  id={feature}
                  checked={formData.features.includes(feature)}
                />
                <label className="form-check-label" htmlFor={feature}>
                  {feature}
                </label>
              </div>
            ))}
          </div>

          {/* EXISTING MEDIA */}
          <hr className="my-4" />
          <h5 className="fw-bold">Media</h5>

          {existingImages?.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Existing Images</label>
              <div className="d-flex flex-wrap gap-2">
                {existingImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={getImageUrl(img)}
                    alt={`Existing ${idx}`}
                    style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 6 }}
                  />
                ))}
              </div>
            </div>
          )}

          {existingFloorPlan && (
            <div className="mb-3">
              <label className="form-label">Existing Floor Plan</label>
              <div>
                <a href={getImageUrl(existingFloorPlan)} target="_blank" rel="noreferrer">
                  Open floor plan
                </a>
              </div>
            </div>
          )}

          {/* ADD NEW MEDIA */}
          <div className="mb-3">
            <label className="form-label">Add New Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              onChange={e => setNewImages([...e.target.files])}
              className="form-control"
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Replace/Upload Floor Plan (optional)</label>
            <input
              type="file"
              name="floorPlanImage"
              accept="image/*,application/pdf"
              onChange={(e) => setFloorPlanImage(e.target.files?.[0] || null)}
              className="form-control"
            />
          </div>

          {/* ---- LOCATION (Google Maps + SearchBox) ---- */}
          <hr className="my-4" />
          <h5 className="fw-bold">Property location</h5>

          <label className="form-label mt-2">Search address</label>
          <div className="mb-2" style={{ maxWidth: 560 }}>
            {isLoaded && apiKey ? (
              <StandaloneSearchBox onLoad={onSearchLoad} onPlacesChanged={onPlacesChanged}>
                <input
                  type="text"
                  placeholder="Street, number, area"
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </StandaloneSearchBox>
            ) : (
              <input
                type="text"
                className="form-control"
                placeholder="Enable Google Maps by setting an API key"
                disabled
              />
            )}
          </div>

          <div className="mb-2 small text-muted">
            Click on the map to (re)pin the exact property location
          </div>

          <div className="rounded overflow-hidden border" style={{ height: 320, position: 'relative' }}>
            {isLoaded && apiKey ? (
              <GoogleMap
                onLoad={setMap}
                mapContainerStyle={containerStyle}
                center={center}
                zoom={latLng ? 14 : 12}
                onClick={onMapClick}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: 'greedy',
                }}
              >
                {latLng && <Marker position={latLng} />}
              </GoogleMap>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                {apiKey ? 'Loading map…' : 'Google Maps disabled (missing API key)'}
              </div>
            )}
          </div>

          <div className="row g-2 mt-2" style={{ maxWidth: 560 }}>
            <div className="col">
              <input className="form-control" value={latLng?.lat || ''} readOnly placeholder="Latitude" />
            </div>
            <div className="col">
              <input className="form-control" value={latLng?.lng || ''} readOnly placeholder="Longitude" />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="d-flex justify-content-between mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>

            <button type="submit" className="btn btn-primary rounded-pill px-4">
              Update Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProperty;
