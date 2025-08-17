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
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || // αν το έχεις επίσης
    ''
  );
}

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [formData, setFormData] = useState({
    title: '', location: '', price: '', type: 'sale', floor: '',
    squareMeters: '', surface: '', onTopFloor: false, levels: '',
    bedrooms: '', bathrooms: '', wc: '', kitchens: '', livingRooms: '',
    status: 'available', features: []
  });

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
    setFormData((prev) => ({ ...prev, location: addr }));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      if (results && results[0]) {
        setFormData((prev) => ({ ...prev, location: results[0].formatted_address }));
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
          price: p.price ?? '',
          type: p.type || 'sale',
          floor: p.floor ?? '',
          squareMeters: p.squareMeters ?? '',
          surface: p.surface ?? '',
          onTopFloor: !!p.onTopFloor,
          levels: p.levels ?? '',
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          wc: p.wc ?? '',
          kitchens: p.kitchens ?? '',
          livingRooms: p.livingRooms ?? '',
          status: p.status || 'available',
          features: Array.isArray(p.features) ? p.features : []
        });

        setExistingImages(Array.isArray(p.images) ? p.images : []);

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
    } else if (type === 'checkbox' && name === 'onTopFloor') {
      setFormData(prev => ({ ...prev, onTopFloor: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e) => setNewImages([...e.target.files]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const submissionData = new FormData();

    const parseOrUndefined = (val, parser = parseInt) =>
      val !== '' && !isNaN(parser(val)) ? parser(val) : undefined;

    const cleanedData = {
      ...formData,
      price: parseOrUndefined(formData.price, parseFloat),
      floor: parseOrUndefined(formData.floor),
      squareMeters: parseOrUndefined(formData.squareMeters),
      surface: parseOrUndefined(formData.surface),
      levels: parseOrUndefined(formData.levels),
      bedrooms: parseOrUndefined(formData.bedrooms),
      bathrooms: parseOrUndefined(formData.bathrooms),
      wc: parseOrUndefined(formData.wc),
      kitchens: parseOrUndefined(formData.kitchens),
      livingRooms: parseOrUndefined(formData.livingRooms),
      onTopFloor: formData.onTopFloor === true || formData.onTopFloor === 'true',
      features: formData.features || []
    };

    Object.entries(cleanedData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => submissionData.append(`${key}[]`, v));
      } else if (value !== undefined) {
        submissionData.append(key, value);
      }
    });

    if (latLng) {
      submissionData.append('latitude', String(latLng.lat));
      submissionData.append('longitude', String(latLng.lng));
    }

    newImages.forEach((img) => submissionData.append('images', img));

    try {
      await api.put(`/properties/${propertyId}`, submissionData, {
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
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
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
          {[
            ['Title', 'title'], ['Location', 'location'], ['Price', 'price'], ['Floor', 'floor'],
            ['Square Meters', 'squareMeters'], ['Surface (m²)', 'surface'], ['Levels', 'levels'],
            ['Bedrooms', 'bedrooms'], ['Bathrooms', 'bathrooms'], ['WC', 'wc'],
            ['Kitchens', 'kitchens'], ['Living Rooms', 'livingRooms']
          ].map(([label, name]) => (
            <div className="mb-3" key={name}>
              <label className="form-label">{label}</label>
              <input
                type={['price','floor','squareMeters','surface','levels','bedrooms','bathrooms','wc','kitchens','livingRooms'].includes(name) ? 'number' : 'text'}
                name={name}
                value={formData[name]}
                onChange={handleChange}
                className="form-control"
                required={['title','location','price'].includes(name)}
              />
            </div>
          ))}

          <div className="mb-3">
            <label className="form-label">Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="form-control">
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="form-control">
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="form-check mb-3">
            <input
              type="checkbox"
              className="form-check-input"
              id="onTopFloor"
              name="onTopFloor"
              checked={!!formData.onTopFloor}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="onTopFloor">On Top Floor</label>
          </div>

          <div className="mb-3">
            <label className="form-label">Features</label>
            <div className="d-flex flex-wrap gap-3">
              {['parking','elevator','furnished','fireplace','airCondition','solarWater','secureDoor'].map((feature) => (
                <div className="form-check" key={feature}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={feature}
                    name="features"
                    value={feature}
                    checked={formData.features.includes(feature)}
                    onChange={handleChange}
                  />
                  <label className="form-check-label" htmlFor={feature}>{feature}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Images */}
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

          {/* Add New Images */}
          <div className="mb-4">
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

          <div className="d-flex justify-content-between mt-4">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">Update Property</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProperty;
