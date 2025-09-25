import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

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

  const [images, setImages] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
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

      // Normalize intent from UI "type"
      const intent = form.type === 'sale' ? 'buy' : 'rent';

      // Build normalized attributes (this is what the backend should index/match on)
      const attributes = {
        intent,                                        // 'rent' | 'buy'
        location: { city: form.city.trim(), area: form.area.trim() || undefined },
        price: Number(form.price),                     // rent or sale price
        propertyType: form.propertyType,               // enum
        bedrooms: toNumOrUndef(form.bedrooms),
        bathrooms: toNumOrUndef(form.bathrooms),
        sizeSqm: toNumOrUndef(form.squareMeters),      // <-- name used in matching
        furnished: !!form.furnished,
        hasParking: !!form.hasParking,
        petsAllowed: !!form.petsAllowed,
        smokerOk: !!form.smokingAllowed,               // if your matching uses 'smokerOk'
        heating: form.heating || undefined,
        amenities: (form.amenitiesInput || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      };

      // BASIC FIELDS (non-matching, for listing page)
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description);
      if (form.address) fd.append('address', form.address);
      fd.append('status', form.status);    // validated enum server-side

      // If your backend still uses legacy fields (e.g., location as string), send a display location too:
      const displayLocation = [form.city, form.area].filter(Boolean).join(', ');
      fd.append('location', displayLocation);

      // Attach normalized attributes JSON (primary source of truth for matching)
      fd.append('attributes', JSON.stringify(attributes));

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
