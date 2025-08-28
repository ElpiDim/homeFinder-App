// src/pages/AddProperty.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    price: '',
    type: 'rent',
    status: 'available',
    squareMeters: '',
    bedrooms: '',
    bathrooms: '',
    // tenant requirements
    minTenantSalary: '',
    allowedOccupations: '',
    requiresFamily: false,
    allowsSmokers: true,
    allowsPets: true,
    maxOccupants: '',
  });
  const [images, setImages] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const fd = new FormData();
      // basics
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('location', form.location);
      if (form.address) fd.append('address', form.address);
      fd.append('price', form.price);
      fd.append('type', form.type);
      fd.append('status', form.status);
      if (form.squareMeters) fd.append('squareMeters', form.squareMeters);
      if (form.bedrooms) fd.append('bedrooms', form.bedrooms);
      if (form.bathrooms) fd.append('bathrooms', form.bathrooms);

      // tenant requirements (flat fields expected by controller)
      if (form.minTenantSalary) fd.append('minTenantSalary', form.minTenantSalary);
      if (form.allowedOccupations) {
        form.allowedOccupations
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(v => fd.append('allowedOccupations[]', v));
      }
      fd.append('requiresFamily', form.requiresFamily ? 'true' : 'false');
      fd.append('allowsSmokers', form.allowsSmokers ? 'true' : 'false');
      fd.append('allowsPets', form.allowsPets ? 'true' : 'false');
      if (form.maxOccupants) fd.append('maxOccupants', form.maxOccupants);

      // files
      images.forEach(f => fd.append('images', f));
      if (floorPlan) fd.append('floorPlanImage', floorPlan);

      await api.post('/properties', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMsg('Property created!');
      navigate('/dashboard');
    } catch (err) {
      console.error('create property failed', err);
      setMsg(err.response?.data?.message || 'Failed to create property');
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
      {msg && <div className="alert alert-info">{msg}</div>}

      <form onSubmit={submit}>
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input className="form-control" name="title" value={form.title} onChange={onChange} required />
        </div>

        <div className="mb-3">
          <label className="form-label">Location</label>
          <input className="form-control" name="location" value={form.location} onChange={onChange} required />
        </div>

        <div className="row g-3">
          <div className="col-sm-4">
            <label className="form-label">Price (€)</label>
            <input type="number" className="form-control" name="price" value={form.price} onChange={onChange} required />
          </div>
          <div className="col-sm-4">
            <label className="form-label">Type</label>
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

        <div className="mb-3 mt-3">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={3} name="description" value={form.description} onChange={onChange} />
        </div>

        <h5 className="mt-3">Tenant requirements</h5>
        <div className="row g-3">
          <div className="col-sm-4">
            <label className="form-label">Min tenant salary (€)</label>
            <input type="number" className="form-control" name="minTenantSalary" value={form.minTenantSalary} onChange={onChange} />
          </div>
          <div className="col-sm-4">
            <label className="form-label">Allowed occupations (comma separated)</label>
            <input className="form-control" name="allowedOccupations" value={form.allowedOccupations} onChange={onChange} placeholder="student, engineer" />
          </div>
          <div className="col-sm-4">
            <label className="form-label">Max occupants</label>
            <input type="number" className="form-control" name="maxOccupants" value={form.maxOccupants} onChange={onChange} />
          </div>
        </div>

        <div className="d-flex gap-4 my-2">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="reqFamily" name="requiresFamily" checked={form.requiresFamily} onChange={onChange} />
            <label className="form-check-label" htmlFor="reqFamily">Requires family</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="allowSmoke" name="allowsSmokers" checked={form.allowsSmokers} onChange={onChange} />
            <label className="form-check-label" htmlFor="allowSmoke">Allows smokers</label>
          </div>
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="allowPets" name="allowsPets" checked={form.allowsPets} onChange={onChange} />
            <label className="form-check-label" htmlFor="allowPets">Allows pets</label>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Images</label>
          <input type="file" className="form-control" multiple accept="image/*" onChange={(e) => setImages([...e.target.files])} />
        </div>

        <div className="mb-3">
          <label className="form-label">Floor plan</label>
          <input type="file" className="form-control" accept="image/*,application/pdf" onChange={(e) => setFloorPlan(e.target.files?.[0] || null)} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
