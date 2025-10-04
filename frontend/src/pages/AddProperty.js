import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import './AddProperty.css';

const AMENITY_OPTIONS = [
  'Elevator',
  'Balcony',
  'Air Conditioning',
  'Garden',
  'Storage',
  'Fireplace',
  'Swimming Pool',
  'Security Door',
  'Solar Water Heater',
  'Renovated',
  'Energy-efficient',
];

const toNumOrUndef = (v) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    area: '',
    address: '',
    price: '',
    type: 'rent',
    status: 'available',
    squareMeters: '',
    bedrooms: '',
    bathrooms: '',
    propertyType: 'apartment',
    furnished: false,
    hasParking: false,
    petsAllowed: false,
    smokingAllowed: false,
    heating: '',
    amenitiesInput: '',
    yearBuilt: '', // 🆕 new field
  });

  const [tenantReqs, setTenantReqs] = useState({
    minTenantSalary: '',
    allowedOccupations: '',
    minTenantAge: '',
    maxTenantAge: '',
    maxHouseholdSize: '',
    roommatePreference: 'any',
    familyStatus: 'any',
    petsAllowed: false,
    smokingAllowed: false,
    notes: '',
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
    setTenantReqs((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const validate = () => {
    const priceNum = Number(form.price);
    if (!form.title.trim()) return 'Title is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!Number.isFinite(priceNum) || priceNum <= 0) return 'Price must be a positive number.';

    const beds = toNumOrUndef(form.bedrooms);
    const baths = toNumOrUndef(form.bathrooms);
    const sqm = toNumOrUndef(form.squareMeters);
    const year = toNumOrUndef(form.yearBuilt);

    if (beds !== undefined && beds < 0) return 'Bedrooms cannot be negative.';
    if (baths !== undefined && baths < 0) return 'Bathrooms cannot be negative.';
    if (sqm !== undefined && sqm <= 0) return 'Square meters must be positive.';
    if (year !== undefined && (year < 1800 || year > new Date().getFullYear()))
      return 'Please enter a valid construction year.';

    const minAge = toNumOrUndef(tenantReqs.minTenantAge);
    const maxAge = toNumOrUndef(tenantReqs.maxTenantAge);
    const maxHouseholdSize = toNumOrUndef(tenantReqs.maxHouseholdSize);
    if (minAge !== undefined && minAge < 18) return 'Minimum tenant age must be at least 18.';
    if (maxAge !== undefined && maxAge < 18) return 'Maximum tenant age must be at least 18.';
    if (minAge !== undefined && maxAge !== undefined && maxAge < minAge)
      return 'Maximum tenant age must be greater than or equal to minimum tenant age.';
    if (maxHouseholdSize !== undefined && maxHouseholdSize <= 0)
      return 'Maximum household size must be a positive number.';

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

      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description);
      if (form.address) fd.append('address', form.address);

      const displayLocation = [form.city.trim(), form.area.trim()]
        .filter(Boolean)
        .join(', ');
      fd.append('location', displayLocation);

      fd.append('price', form.price);
      fd.append('type', form.type);
      fd.append('status', form.status);

      if (form.squareMeters) fd.append('squareMeters', form.squareMeters);
      if (form.bedrooms) fd.append('bedrooms', form.bedrooms);
      if (form.bathrooms) fd.append('bathrooms', form.bathrooms);
      if (form.propertyType) fd.append('propertyType', form.propertyType);
      if (form.heating) fd.append('heating', form.heating);
      if (form.yearBuilt) fd.append('yearBuilt', form.yearBuilt); // 🆕 send to backend

      fd.append('furnished', form.furnished);
      fd.append('petsAllowed', form.petsAllowed);
      fd.append('smokingAllowed', form.smokingAllowed);
      fd.append('parking', form.hasParking);

      const features = (form.amenitiesInput || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (features.length) fd.append('features', features.join(','));

      // tenant requirements
      if (tenantReqs.minTenantSalary) fd.append('minTenantSalary', tenantReqs.minTenantSalary);
      if (tenantReqs.allowedOccupations)
        fd.append('allowedOccupations', tenantReqs.allowedOccupations);
      if (tenantReqs.familyStatus && tenantReqs.familyStatus !== 'any')
        fd.append('familyStatus', tenantReqs.familyStatus);
      fd.append('tenantRequirements_petsAllowed', tenantReqs.petsAllowed);
      fd.append('tenantRequirements_smokingAllowed', tenantReqs.smokingAllowed);
      if (tenantReqs.minTenantAge) fd.append('minTenantAge', tenantReqs.minTenantAge);
      if (tenantReqs.maxTenantAge) fd.append('maxTenantAge', tenantReqs.maxTenantAge);
      if (tenantReqs.maxHouseholdSize)
        fd.append('maxHouseholdSize', tenantReqs.maxHouseholdSize);
      if (tenantReqs.roommatePreference && tenantReqs.roommatePreference !== 'any')
        fd.append('roommatePreference', tenantReqs.roommatePreference);
      if (tenantReqs.notes) fd.append('tenantRequirements_notes', tenantReqs.notes);

      images.forEach((file) => fd.append('images', file));
      if (floorPlan) fd.append('floorPlanImage', floorPlan);

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
    return (
      <div className="add-property-container">
        <Card className="add-property-card">
          <Card.Body className="p-4">Only owners can add properties.</Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="add-property-container">
      <Card className="add-property-card shadow-lg">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <Logo />
            <h3 className="mt-3 mb-1">List a New Property</h3>
            <p className="text-muted mb-0">
              Share details about your property and outline the tenant profile that best matches
              onboarding preferences.
            </p>
          </div>

          {msg && (
            <div
              className={`alert ${
                msg.toLowerCase().includes('fail') ? 'alert-danger' : 'alert-success'
              } add-property-alert`}
            >
              {msg}
            </div>
          )}

          <Form onSubmit={submit} noValidate className="add-property-form">
            <section className="add-property-section">
              <header className="section-header">
                <h5 className="section-title mb-1">Listing Overview</h5>
                <p className="section-description mb-0">
                  Basic information that helps clients discover your property during matching.
                </p>
              </header>

              {/* Title + Type */}
              <Row className="g-3">
                <Col md={8}>
                  <Form.Group controlId="title">
                    <Form.Label className="field-label">
                      Title <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      name="title"
                      value={form.title}
                      onChange={onChange}
                      placeholder="e.g., Bright 2-bedroom apartment in Athens"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="listing-type">
                    <Form.Label className="field-label">Listing Type</Form.Label>
                    <Form.Select name="type" value={form.type} onChange={onChange}>
                      <option value="rent">Rent</option>
                      <option value="sale">Sale</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* City + Area */}
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="city">
                    <Form.Label className="field-label">
                      City <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      name="city"
                      value={form.city}
                      onChange={onChange}
                      placeholder="e.g., Athens"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group controlId="area">
                    <Form.Label className="field-label">Area (optional)</Form.Label>
                    <Form.Control
                      name="area"
                      value={form.area}
                      onChange={onChange}
                      placeholder="e.g., Koukaki"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Address + Status */}
              <Row className="g-3">
                <Col md={8}>
                  <Form.Group controlId="address">
                    <Form.Label className="field-label">Address (optional)</Form.Label>
                    <Form.Control
                      name="address"
                      value={form.address}
                      onChange={onChange}
                      placeholder="Street & number"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="status">
                    <Form.Label className="field-label">Status</Form.Label>
                    <Form.Select name="status" value={form.status} onChange={onChange}>
                      <option value="available">Available</option>
                      <option value="rented">Rented</option>
                      <option value="sold">Sold</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Price + sqm + property type */}
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group controlId="price">
                    <Form.Label className="field-label">
                      {form.type === 'sale' ? 'Price (€)' : 'Rent (€)'}{' '}
                      <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      step="1"
                      name="price"
                      value={form.price}
                      onChange={onChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="squareMeters">
                    <Form.Label className="field-label">Square meters</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      name="squareMeters"
                      value={form.squareMeters}
                      onChange={onChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="propertyType">
                    <Form.Label className="field-label">Property Type</Form.Label>
                    <Form.Select name="propertyType" value={form.propertyType} onChange={onChange}>
                      <option value="">Any</option>
                      <option value="apartment">Apartment</option>
                      <option value="studio">Studio</option>
                      <option value="house">House</option>
                      <option value="maisonette">Maisonette</option>
                      <option value="loft">Loft</option>
                      <option value="duplex">Duplex</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Year built + rooms + heating */}
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group controlId="yearBuilt">
                    <Form.Label className="field-label">Year built (optional)</Form.Label>
                    <Form.Control
                      type="number"
                      name="yearBuilt"
                      min="1800"
                      max={new Date().getFullYear()}
                      value={form.yearBuilt}
                      onChange={onChange}
                      placeholder="e.g., 1998"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="bedrooms">
                    <Form.Label className="field-label">Bedrooms</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      name="bedrooms"
                      value={form.bedrooms}
                      onChange={onChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="bathrooms">
                    <Form.Label className="field-label">Bathrooms</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      name="bathrooms"
                      value={form.bathrooms}
                      onChange={onChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Heating */}
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group controlId="heating">
                    <Form.Label className="field-label">Heating (optional)</Form.Label>
                    <Form.Control
                      name="heating"
                      value={form.heating}
                      onChange={onChange}
                      placeholder="e.g., natural gas, heat pump"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Checkboxes */}
              <Row className="g-3 align-items-center mt-2">
                <Col sm={3}>
                  <Form.Check
                    id="furnished"
                    label="Furnished"
                    name="furnished"
                    checked={form.furnished}
                    onChange={onChange}
                  />
                </Col>
                <Col sm={3}>
                  <Form.Check
                    id="hasParking"
                    label="Parking"
                    name="hasParking"
                    checked={form.hasParking}
                    onChange={onChange}
                  />
                </Col>
                <Col sm={3}>
                  <Form.Check
                    id="petsAllowed"
                    label="Pets allowed"
                    name="petsAllowed"
                    checked={form.petsAllowed}
                    onChange={onChange}
                  />
                </Col>
                <Col sm={3}>
                  <Form.Check
                    id="smokingAllowed"
                    label="Smoking allowed"
                    name="smokingAllowed"
                    checked={form.smokingAllowed}
                    onChange={onChange}
                  />
                </Col>
              </Row>

                        <Form.Group className="mt-3" controlId="amenities">
            <Form.Label className="field-label">Amenities</Form.Label>
            <Row className="g-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <Col xs={6} md={4} key={amenity}>
                  <Form.Check
                    type="checkbox"
                    label={amenity}
                    checked={(form.amenitiesInput || '').split(',').includes(amenity)}
                    onChange={(e) => {
                      const selected = new Set((form.amenitiesInput || '').split(',').filter(Boolean));
                      if (e.target.checked) selected.add(amenity);
                      else selected.delete(amenity);
                      setForm((prev) => ({
                        ...prev,
                        amenitiesInput: Array.from(selected).join(','),
                      }));
                    }}
                  />
                </Col>
              ))}
            </Row>
            <Form.Text className="text-muted">
              Select all amenities that apply to this property.
            </Form.Text>
          </Form.Group>

              {/* Description */}
              <Form.Group className="mt-3" controlId="description">
                <Form.Label className="field-label">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  placeholder="Highlight what makes this property great for your ideal tenant."
                />
              </Form.Group>
            </section>

            {/* Tenant fit + media stay identical */}

            <section className="add-property-section">
              <header className="section-header">
                <h5 className="section-title mb-1">Media</h5>
                <p className="section-description mb-0">
                  Upload visuals that help clients fall in love with your property.
                </p>
              </header>

              <Form.Group controlId="propertyImages" className="mb-3">
                <Form.Label className="field-label">Images</Form.Label>
                <Form.Control
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setImages(Array.from(e.target.files || []))}
                />
                {images.length === 0 && (
                  <Form.Text className="text-muted">
                    Adding at least one photo improves visibility in the client dashboard.
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group controlId="floorPlan" className="mb-0">
                <Form.Label className="field-label">Floor plan (optional)</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFloorPlan(e.target.files?.[0] || null)}
                />
              </Form.Group>
            </section>

            <div className="d-flex justify-content-end mt-4">
              <Button type="submit" className="btn-onboarding-next" disabled={saving}>
                {saving ? 'Saving…' : 'Create listing'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
