// src/pages/EditProperty.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Form, Button } from 'react-bootstrap';
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

// --- image URL helpers (όπως στα άλλα pages: όχι localhost hardcode) ---
const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');
const normalizeUploadPath = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const clean = src.replace(/^\/+/, '');
  return clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
};
const getImageUrl = (path) =>
  path ? `${API_ORIGIN}${normalizeUploadPath(path)}` : '';

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
    // core
    title: '',
    location: '',
    address: '',
    price: '',            // 💶 unified (reads old rent if exists)
    type: 'sale',
    status: 'available',

    // basics
    description: '',
    floor: '',
    squareMeters: '',
    surface: '',
    onTopFloor: false,
    levels: '',
    bedrooms: '',
    bathrooms: '',
    wc: '',
    kitchens: '',
    livingRooms: '',

    // extras
    yearBuilt: '',
    condition: '',
    heating: '',
    energyClass: '',
    orientation: '',
    furnished: false,
    petsAllowed: false,
    smokingAllowed: false,
    hasElevator: false,
    hasStorage: false,
    parkingSpaces: '',
    monthlyMaintenanceFee: '',
    view: '',
    insulation: false,
    plotSize: '',
    ownerNotes: '',

    //tnant requirements 
    minTenantSalary: '',
    allowedOccupations: '',
    familyStatus: '',
    tenantRequirements_petsAllowed: false,
    tenantRequirements_smokingAllowed: false,

    // tags
    features: [],
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
        const reqs = p.tenantRequirements || {};

        setFormData({
          title: p.title || '',
          location: p.location || '',
          address: p.address || '',
          price: p.price ?? p.rent ?? '',        // 💶 read both, prefer price
          type: p.type || 'sale',
          status: p.status || 'available',

          description: p.description || '',
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

          yearBuilt: p.yearBuilt ?? '',
          condition: p.condition || '',
          heating: p.heating || '',
          energyClass: p.energyClass || '',
          orientation: p.orientation || '',
          furnished: !!p.furnished,
          petsAllowed: !!p.petsAllowed,
          smokingAllowed: !!p.smokingAllowed,
          hasElevator: !!p.hasElevator,
          hasStorage: !!p.hasStorage,
          parkingSpaces: p.parkingSpaces ?? '',
          monthlyMaintenanceFee: p.monthlyMaintenanceFee ?? '',
          view: p.view || '',
          insulation: !!p.insulation,
          plotSize: p.plotSize ?? '',
          ownerNotes: p.ownerNotes || '',
         
          // Tenant Requirements
          minTenantSalary: reqs.minTenantSalary ?? '',
          allowedOccupations: Array.isArray(reqs.allowedOccupations)
            ? reqs.allowedOccupations.join(', ')
            : '',
          familyStatus: reqs.familyStatus || '',
          tenantRequirements_petsAllowed: !!reqs.pets,
          tenantRequirements_smokingAllowed: !!reqs.smoker,
          
          features: Array.isArray(p.features) ? p.features : [],
        });

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

    const boolKeys = [
      'onTopFloor','furnished','petsAllowed','smokingAllowed',
      'hasElevator','hasStorage','insulation',
      'tenantRequirements_petsAllowed', 'tenantRequirements_smokingAllowed'
    ];
    if (type === 'checkbox' && boolKeys.includes(name)) {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toNumOrUndef = (v, parser = parseFloat) =>
    v === '' || v === null || v === undefined || Number.isNaN(parser(v))
      ? undefined
      : parser(v);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // basic validation
    const priceNum = toNumOrUndef(formData.price, parseFloat);
    if (!formData.title.trim()) return alert('Title is required.');
    if (!formData.location.trim()) return alert('Location is required.');
    if (priceNum === undefined || priceNum <= 0) return alert('Price must be a positive number.');

    const data = new FormData();

    const cleaned = {
      // core
      title: formData.title,
      location: formData.location,
      address: formData.address,
      type: formData.type,
      status: formData.status,
      price: priceNum, // 💶 send price (not rent)

      // basics
      description: formData.description,
      floor: toNumOrUndef(formData.floor, parseInt),
      squareMeters: toNumOrUndef(formData.squareMeters, parseInt),
      surface: toNumOrUndef(formData.surface, parseInt),
      onTopFloor: formData.onTopFloor ? 'true' : 'false',
      levels: toNumOrUndef(formData.levels, parseInt),
      bedrooms: toNumOrUndef(formData.bedrooms, parseInt),
      bathrooms: toNumOrUndef(formData.bathrooms, parseInt),
      wc: toNumOrUndef(formData.wc, parseInt),
      kitchens: toNumOrUndef(formData.kitchens, parseInt),
      livingRooms: toNumOrUndef(formData.livingRooms, parseInt),

      // extras
      yearBuilt: toNumOrUndef(formData.yearBuilt, parseInt),
      condition: formData.condition,
      heating: formData.heating,
      energyClass: formData.energyClass,
      orientation: formData.orientation,
      furnished: formData.furnished ? 'true' : 'false',
      petsAllowed: formData.petsAllowed ? 'true' : 'false',
      smokingAllowed: formData.smokingAllowed ? 'true' : 'false',
      hasElevator: formData.hasElevator ? 'true' : 'false',
      hasStorage: formData.hasStorage ? 'true' : 'false',
      parkingSpaces: toNumOrUndef(formData.parkingSpaces, parseInt),
      monthlyMaintenanceFee: toNumOrUndef(formData.monthlyMaintenanceFee, parseFloat),
      view: formData.view,
      insulation: formData.insulation ? 'true' : 'false',
      plotSize: toNumOrUndef(formData.plotSize, parseInt),
      ownerNotes: formData.ownerNotes,
     
      //tenant requirements 
      minTenantSalary: toNumOrUndef(formData.minTenantSalary, parseFloat),
      familyStatus: formData.familyStatus,
      tenantRequirements_petsAllowed: formData.tenantRequirements_petsAllowed ? 'true' : 'false',
      tenantRequirements_smokingAllowed: formData.tenantRequirements_smokingAllowed ? 'true' : 'false',
    };

    // Append only meaningful fields
    Object.entries(cleaned).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') data.append(k, v);
    });

    // allowed occupations → array form
    String(formData.allowedOccupations || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((o) => data.append('allowedOccupations[]', o));

    // features
    if (Array.isArray(formData.features) && formData.features.length) {
      formData.features.forEach((f) => data.append('features[]', f));
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
      // ❗ μην ορίζεις χειροκίνητα headers εδώ — το axios interceptor σου βάζει Authorization
      // και ο browser ορίζει σωστό multipart boundary
      await api.put(`/properties/${propertyId}`, data);
      navigate(`/property/${propertyId}`);
    } catch (err) {
      console.error('❌ Error updating property:', err);
      alert(err?.response?.data?.message || 'Update failed');
    }
  };

  // Pastel gradient
  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #4b0082 0%, #6f42c1 33%, #a020f0 66%, #e0b0ff 100%)',
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
                min={1}
                step="1"
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

          {/* BASIC METRICS */}
          <div className="row g-3">
            <div className="col-sm-3">
              <label className="form-label">Floor</label>
              <input name="floor" type="number" className="form-control" value={formData.floor} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Square Meters</label>
              <input name="squareMeters" type="number" className="form-control" value={formData.squareMeters} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Surface (m²)</label>
              <input name="surface" type="number" className="form-control" value={formData.surface} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Levels</label>
              <input name="levels" type="number" className="form-control" value={formData.levels} onChange={handleChange} />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-3">
              <label className="form-label">Bedrooms</label>
              <input name="bedrooms" type="number" className="form-control" value={formData.bedrooms} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Bathrooms</label>
              <input name="bathrooms" type="number" className="form-control" value={formData.bathrooms} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">WC</label>
              <input name="wc" type="number" className="form-control" value={formData.wc} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Kitchens</label>
              <input name="kitchens" type="number" className="form-control" value={formData.kitchens} onChange={handleChange} />
            </div>
          </div>

          <div className="row g-3 mt-2">
            <div className="col-sm-3">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="onTopFloor" name="onTopFloor" checked={!!formData.onTopFloor} onChange={handleChange} />
                <label className="form-check-label" htmlFor="onTopFloor">On Top Floor</label>
              </div>
            </div>
            <div className="col-sm-3">
              <label className="form-label">Plot Size (m²)</label>
              <input name="plotSize" type="number" className="form-control" value={formData.plotSize} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Year Built</label>
              <input name="yearBuilt" type="number" className="form-control" value={formData.yearBuilt} onChange={handleChange} />
            </div>
          </div>

          {/* EXTRAS */}
          <hr className="my-3" />
          <h5 className="fw-bold">Extras</h5>

          <div className="row g-3">
            <div className="col-sm-4">
              <label className="form-label">Heating</label>
              <select name="heating" className="form-control" value={formData.heating} onChange={handleChange}>
                <option value="">—</option>
                <option value="none">None</option>
                <option value="central">Central</option>
                <option value="autonomous">Autonomous</option>
                <option value="gas">Gas</option>
                <option value="ac">A/C (Heat Pump)</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Energy Class</label>
              <select name="energyClass" className="form-control" value={formData.energyClass} onChange={handleChange}>
                <option value="">—</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
                <option value="G">G</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Orientation</label>
              <select name="orientation" className="form-control" value={formData.orientation} onChange={handleChange}>
                <option value="">—</option>
                <option value="north">North</option>
                <option value="north-east">North-East</option>
                <option value="east">East</option>
                <option value="south-east">South-East</option>
                <option value="south">South</option>
                <option value="south-west">South-West</option>
                <option value="west">West</option>
                <option value="north-west">North-West</option>
              </select>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <label className="form-label">Condition</label>
              <select name="condition" className="form-control" value={formData.condition} onChange={handleChange}>
                <option value="">—</option>
                <option value="new">New</option>
                <option value="renovated">Renovated</option>
                <option value="good">Good</option>
                <option value="needs renovation">Needs Renovation</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">View</label>
              <select name="view" className="form-control" value={formData.view} onChange={handleChange}>
                <option value="">—</option>
                <option value="sea">Sea</option>
                <option value="mountain">Mountain</option>
                <option value="park">Park</option>
                <option value="city">City</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Parking Spaces</label>
              <input name="parkingSpaces" type="number" className="form-control" value={formData.parkingSpaces} onChange={handleChange} min={0} />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="furnished" name="furnished" checked={!!formData.furnished} onChange={handleChange} />
                <label className="form-check-label" htmlFor="furnished">Furnished</label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="petsAllowed" name="petsAllowed" checked={!!formData.petsAllowed} onChange={handleChange} />
                <label className="form-check-label" htmlFor="petsAllowed">Pets Allowed</label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="smokingAllowed" name="smokingAllowed" checked={!!formData.smokingAllowed} onChange={handleChange} />
                <label className="form-check-label" htmlFor="smokingAllowed">Smoking Allowed</label>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="hasElevator" name="hasElevator" checked={!!formData.hasElevator} onChange={handleChange} />
                <label className="form-check-label" htmlFor="hasElevator">Elevator</label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="hasStorage" name="hasStorage" checked={!!formData.hasStorage} onChange={handleChange} />
                <label className="form-check-label" htmlFor="hasStorage">Storage</label>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="form-check mt-4">
                <input type="checkbox" className="form-check-input" id="insulation" name="insulation" checked={!!formData.insulation} onChange={handleChange} />
                <label className="form-check-label" htmlFor="insulation">Insulation</label>
              </div>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-6">
              <label className="form-label">Monthly Maintenance Fee (€)</label>
              <input name="monthlyMaintenanceFee" type="number" className="form-control" value={formData.monthlyMaintenanceFee} onChange={handleChange} min={0} />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Owner Notes (private)</label>
              <input name="ownerNotes" className="form-control" value={formData.ownerNotes} onChange={handleChange} placeholder="Internal notes (not visible to tenants)" />
            </div>
          </div>

          <h5 className="mt-4">Tenant Requirements</h5>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Minimum Tenant Salary (€)</Form.Label>
                <Form.Control
                name="minTenantSalary"
                type="number"
                value={formData.minTenantSalary}
                onChange={handleChange}
                min={0}
              />
            </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Allowed Occupations (comma separated)</Form.Label>
                <Form.Control
                name="allowedOccupations"
                value={formData.allowedOccupations}
                onChange={handleChange}
                placeholder="e.g. Engineer, Teacher"
              />
 </Form.Group>
            </Col>
          </Row>
          <Row className="g-3 mt-0">
            <Col md={4}>
                <Form.Group>
                <Form.Label>Family Status</Form.Label>
                <Form.Select name="familyStatus" value={formData.familyStatus} onChange={handleChange}>
                    <option value="">Any</option>
                    <option value="single">Single</option>
                    <option value="couple">Couple</option>
                    <option value="family">Family</option>
                </Form.Select>
                </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
                <Form.Check 
                  label="Pets allowed for tenant" 
                  name="tenantRequirements_petsAllowed" 
                  checked={!!formData.tenantRequirements_petsAllowed} 
                  onChange={handleChange} />
            </Col>
            <Col md={4} className="d-flex align-items-end">
                <Form.Check 
                  label="Smoking allowed for tenant" 
                  name="tenantRequirements_smokingAllowed" 
                  checked={!!formData.tenantRequirements_smokingAllowed} 
                  onChange={handleChange} />
            </Col>
        </Row>

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
              onChange={e => setNewImages(Array.from(e.target.files || []))}
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
