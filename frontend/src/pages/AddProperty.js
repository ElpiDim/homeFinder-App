import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Form } from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import TriStateSelect from '../components/TristateSelect';

const toNumOrUndef = (v) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',          // normalized: use city + area for matching
    area: '',
    address: '',
    price: '',         // rent OR purchase price (depends on type)
    type: 'rent',      // rent | sale  (UI), will normalize to attributes.intent: rent|buy
    status: 'available', // available | rented | sold
    squareMeters: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: 'apartment', // apartment|house|studio|maisonette (example enum)
    furnished: false,
    hasParking: false,
    petsAllowed: false,
    smokingAllowed: false,
    heating: '',       // free text for now, can be enum later
    amenitiesInput: '',// comma-separated input that we’ll split to array
  });
  const [tenantReqs, setTenantReqs] = useState({
    minTenantSalary: '',
    allowedOccupationsInput: '',
    familyStatus: '',
    furnished: null,
    parking: null,
    hasElevator: null,
    pets: null,
    smoker: null,
  });

  const [images, setImages] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };
  const onReqsChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setTenantReqs((p) => ({ ...p, [name]: checked }));
    } else if (type === 'custom') {
      setTenantReqs((p) => ({ ...p, [name]: value }));
    } else {
      setTenantReqs((p) => ({ ...p, [name]: value }));
    }
  };

  const validate = () => {
    const priceNum = Number(form.price);
    if (!form.title.trim()) return 'Title is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!Number.isFinite(priceNum) || priceNum <= 0) return 'Price must be a positive number.';
    // Optional guards
    const beds = toNumOrUndef(form.bedrooms);
    const baths = toNumOrUndef(form.bathrooms);
    const sqm = toNumOrUndef(form.squareMeters);
    if (beds !== undefined && beds < 0) return 'Bedrooms cannot be negative.';
    if (baths !== undefined && baths < 0) return 'Bathrooms cannot be negative.';
    if (sqm !== undefined && sqm <= 0) return 'Square meters must be positive.';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');

    const err = validate();
    if (err) return setMsg(err);

    setSaving(true);
    try {
      const fd = new FormData();
 // FIX: The backend expects all properties as individual fields in the FormData,
      // not nested inside an 'attributes' object. This was causing a 400 Bad Request
      // because required fields like 'price' were not found at the top level.
      // We now append each field directly to the FormData object.

      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description);
      if (form.address) fd.append('address', form.address);

       // The backend expects a single 'location' string.
      const displayLocation = [form.city.trim(), form.area.trim()]
        .filter(Boolean)
        .join(', ');
      fd.append('location', displayLocation);

    fd.append('price', form.price);
      fd.append('type', form.type);
      fd.append('status', form.status);

      // Main attributes
      if (form.squareMeters) fd.append('squareMeters', form.squareMeters);
      if (form.bedrooms) fd.append('bedrooms', form.bedrooms);
      if (form.bathrooms) fd.append('bathrooms', form.bathrooms);
      if (form.propertyType) fd.append('propertyType', form.propertyType);
      if (form.heating) fd.append('heating', form.heating);

      // Booleans
      fd.append('furnished', form.furnished);
      fd.append('petsAllowed', form.petsAllowed);
      fd.append('smokingAllowed', form.smokingAllowed);
      // FIX: The backend model uses 'parking' as a boolean alias for 'parkingSpaces'.
      // The form was sending 'hasParking', which the backend did not recognize.
      fd.append('parking', form.hasParking);

      // The backend expects 'features' from a comma-separated list, not 'amenities'.
      const features = (form.amenitiesInput || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (features.length) {
        fd.append('features', features.join(','));
      }

      // Tenant Requirements
      if (tenantReqs.minTenantSalary) {
        fd.append('minTenantSalary', tenantReqs.minTenantSalary);
      }

      const occupations = (tenantReqs.allowedOccupationsInput || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      occupations.forEach((occ) => fd.append('allowedOccupations[]', occ));

      if (tenantReqs.familyStatus) {
        fd.append('familyStatus', tenantReqs.familyStatus);
      }

      const appendTenantBool = (key, value) => {
        if (value === null || value === undefined || value === '') return;
        fd.append(key, value);
      };

      appendTenantBool('tenantRequirements_furnished', tenantReqs.furnished);
      appendTenantBool('tenantRequirements_parking', tenantReqs.parking);
      appendTenantBool('tenantRequirements_hasElevator', tenantReqs.hasElevator);
      appendTenantBool('tenantRequirements_petsAllowed', tenantReqs.pets);
      appendTenantBool('tenantRequirements_smokingAllowed', tenantReqs.smoker);
      
      // Files
      images.forEach((file) => fd.append('images', file));
      if (floorPlan) fd.append('floorPlanImage', floorPlan);

      // IMPORTANT: do NOT set Content-Type manually; browser sets boundary for FormData
      await api.post('/properties', fd);

      setMsg('Property created!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('create property failed', err);
      setMsg(err?.response?.data?.message || 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'owner') {
    return <div className="container mt-4">Only owners can add properties.</div>;
  }

  return (
    <div className="container mt-4">
      <h3>Add Property</h3>

      {msg && (
        <div className={`alert ${msg.toLowerCase().includes('fail') ? 'alert-danger' : 'alert-info'}`}>
          {msg}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">
            Title <span className="badge bg-danger ms-2">Required</span>
          </label>
          <input
            className="form-control"
            name="title"
            value={form.title}
            onChange={onChange}
            required
          />
        </div>

        {/* Location split to city + area to match onboarding preferences */}
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label">
              City <span className="badge bg-danger ms-2">Required</span>
            </label>
            <input
              className="form-control"
              name="city"
              value={form.city}
              onChange={onChange}
              required
              placeholder="e.g., Athens"
            />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Area (optional)</label>
            <input
              className="form-control"
              name="area"
              value={form.area}
              onChange={onChange}
              placeholder="e.g., Center"
            />
          </div>
        </div>

        <div className="mb-2 mt-3">
          <label className="form-label">Address (optional)</label>
          <input
            className="form-control"
            name="address"
            value={form.address}
            onChange={onChange}
            placeholder="Street & number"
          />
        </div>

        <div className="row g-3 mt-0">
          <div className="col-sm-4">
            <label className="form-label">
              {form.type === 'sale' ? 'Price (€)' : 'Rent (€)'} <span className="badge bg-danger ms-2">Required</span>
            </label>
            <input
              type="number"
              className="form-control"
              name="price"
              value={form.price}
              onChange={onChange}
              min="1"
              step="1"
              required
            />
          </div>

          <div className="col-sm-4">
            <label className="form-label">Listing Type</label>
            <select className="form-control" name="type" value={form.type} onChange={onChange}>
              <option value="rent">Rent</option>
              <option value="sale">Sale</option>
            </select>
          </div>

          <div className="col-sm-4">
            <label className="form-label">Status</label>
            <select className="form-control" name="status" value={form.status} onChange={onChange}>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        {/* Matchable core attributes */}
        <h5 className="mt-4">Property Details (used for matching)</h5>

        <div className="row g-3">
          <div className="col-sm-3">
            <label className="form-label">Sqm</label>
            <input
              type="number"
              className="form-control"
              name="squareMeters"
              value={form.squareMeters}
              min="0"
              step="1"
              onChange={onChange}
            />
          </div>
          <div className="col-sm-3">
            <label className="form-label">Bedrooms</label>
            <input
              type="number"
              className="form-control"
              name="bedrooms"
              value={form.bedrooms}
              min="0"
              step="1"
              onChange={onChange}
            />
          </div>
          <div className="col-sm-3">
            <label className="form-label">Bathrooms</label>
            <input
              type="number"
              className="form-control"
              name="bathrooms"
              value={form.bathrooms}
              min="0"
              step="1"
              onChange={onChange}
            />
          </div>
          <div className="col-sm-3">
            <label className="form-label">Property Type</label>
            <select
              className="form-control"
              name="propertyType"
              value={form.propertyType}
              onChange={onChange}
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="studio">Studio</option>
              <option value="maisonette">Maisonette</option>
            </select>
          </div>
        </div>

        <div className="row g-3 mt-0">
          <div className="col-sm-3 d-flex align-items-end gap-2">
            <div className="form-check">
              <input
                id="furnished"
                className="form-check-input"
                type="checkbox"
                name="furnished"
                checked={form.furnished}
                onChange={onChange}
              />
              <label htmlFor="furnished" className="form-check-label">Furnished</label>
            </div>
          </div>
          <div className="col-sm-3 d-flex align-items-end gap-2">
            <div className="form-check">
              <input
                id="hasParking"
                className="form-check-input"
                type="checkbox"
                name="hasParking"
                checked={form.hasParking}
                onChange={onChange}
              />
              <label htmlFor="hasParking" className="form-check-label">Parking</label>
            </div>
          </div>
          <div className="col-sm-3 d-flex align-items-end gap-2">
            <div className="form-check">
              <input
                id="petsAllowed"
                className="form-check-input"
                type="checkbox"
                name="petsAllowed"
                checked={form.petsAllowed}
                onChange={onChange}
              />
              <label htmlFor="petsAllowed" className="form-check-label">Pets allowed</label>
            </div>
          </div>
          <div className="col-sm-3 d-flex align-items-end gap-2">
            <div className="form-check">
              <input
                id="smokingAllowed"
                className="form-check-input"
                type="checkbox"
                name="smokingAllowed"
                checked={form.smokingAllowed}
                onChange={onChange}
              />
              <label htmlFor="smokingAllowed" className="form-check-label">Smoking allowed</label>
            </div>
          </div>
        </div>

        <div className="row g-3 mt-0">
          <div className="col-sm-4">
            <label className="form-label">Heating (optional)</label>
            <input
              className="form-control"
              name="heating"
              value={form.heating}
              onChange={onChange}
              placeholder="e.g., natural gas, heat pump"
            />
          </div>
          <div className="col-sm-8">
            <label className="form-label">Amenities (comma-separated)</label>
            <input
              className="form-control"
              name="amenitiesInput"
              value={form.amenitiesInput}
              onChange={onChange}
              placeholder="e.g., elevator, balcony, AC"
            />
          </div>
        </div>

        <div className="mb-3 mt-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows={3}
            name="description"
            value={form.description}
            onChange={onChange}
          />
        </div>
        
        <h5 className="mt-4">Tenant Requirements</h5>
        <Row className="g-3">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Minimum Tenant Salary (€)</Form.Label>
              <Form.Control
                type="number"
                name="minTenantSalary"
                value={tenantReqs.minTenantSalary}
                onChange={onReqsChange}
              />
            </Form.Group>
          </Col>
          <Col md={8}>
            <Form.Group>
              <Form.Label>Preferred Occupations</Form.Label>
              <Form.Control
                as="textarea"
                rows={1}
                name="allowedOccupationsInput"
                value={tenantReqs.allowedOccupationsInput}
                onChange={onReqsChange}
                placeholder="e.g., engineer, teacher, healthcare"
              />
              <Form.Text className="text-muted">
                Separate multiple occupations with commas.
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>
        <Row className="g-3 mt-0">
          <Col md={4}>
            <Form.Group>
              <Form.Label>Family Status</Form.Label>
              <Form.Select name="familyStatus" value={tenantReqs.familyStatus} onChange={onReqsChange}>
                <option value="">Any</option>
                <option value="single">Single</option>
                <option value="couple">Couple</option>
                <option value="family">Family</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={4}>
            <TriStateSelect
              label="Tenant looking for furnished home"
              name="furnished"
              value={tenantReqs.furnished}
              onChange={onReqsChange}
            />
          </Col>
          <Col md={4}>
            <TriStateSelect
              label="Tenant needs parking"
              name="parking"
              value={tenantReqs.parking}
              onChange={onReqsChange}
            />
          </Col>
        </Row>
        <Row className="g-3 mt-0">
          <Col md={4}>
            <TriStateSelect
              label="Tenant requires elevator"
              name="hasElevator"
              value={tenantReqs.hasElevator}
              onChange={onReqsChange}
            />
          </Col>
          <Col md={4}>
            <TriStateSelect
              label="Pets allowed for tenant"
              name="pets"
              value={tenantReqs.pets}
              onChange={onReqsChange}
            />
          </Col>
          <Col md={4}>
            <TriStateSelect
              label="Smoking allowed for tenant"
              name="smoker"
              value={tenantReqs.smoker}
              onChange={onReqsChange}
            />
          </Col>
        </Row>

        <h5 className="mt-3">Media</h5>

        <div className="mb-3">
          <label className="form-label">Images</label>
          <input
            type="file"
            className="form-control"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
          {images.length === 0 && (
            <div className="form-text">Tip: Adding at least 1 image helps your listing stand out.</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Floor plan</label>
          <input
            type="file"
            className="form-control"
            accept="image/*,application/pdf"
            onChange={(e) => setFloorPlan(e.target.files?.[0] || null)}
          />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
      </form>
    </div>
  );
}