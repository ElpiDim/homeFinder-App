// src/pages/AddProperty.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import RequirementsForm from '../components/RequirementsForm';

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    price: '',
    type: 'rent',          // rent | sale
    status: 'available',   // available | rented | sold
    squareMeters: '',
  });

  const [requirements, setRequirements] = useState({});
  const [images, setImages] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const toNumOrUndef = (v) =>
    v === '' || v === null || v === undefined ? undefined : Number(v);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');

    // --- basic client-side validation ---
    const priceNum = Number(form.price);
    if (!form.title.trim()) return setMsg('Title is required.');
    if (!form.location.trim()) return setMsg('Location is required.');
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setMsg('Price must be a positive number.');

    setSaving(true);
    try {
      const fd = new FormData();

      // basics
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description);
      fd.append('location', form.location.trim());
      if (form.address) fd.append('address', form.address);
      fd.append('price', String(priceNum));
      fd.append('type', form.type);       // validated enum server-side
      fd.append('status', form.status);   // validated enum server-side

      const sqm = toNumOrUndef(form.squareMeters);
      if (sqm !== undefined) fd.append('squareMeters', String(sqm));

      // requirements → send only meaningful entries
      const reqEntries = Object.entries(requirements)
        .filter(([, v]) => v !== undefined && v !== null && v !== '');
      if (reqEntries.length > 0) {
        const reqsAsArray = reqEntries.map(([name, value]) => ({ name, value }));
        fd.append('requirements', JSON.stringify(reqsAsArray));
      }

      // files
      images.forEach((file) => fd.append('images', file));
      if (floorPlan) fd.append('floorPlanImage', floorPlan);

      // IMPORTANT: μην ορίζεις χειροκίνητα Content-Type για FormData
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

        <div className="mb-3">
          <label className="form-label">
            Location <span className="badge bg-danger ms-2">Required</span>
          </label>
          <input
            className="form-control"
            name="location"
            value={form.location}
            onChange={onChange}
            required
          />
        </div>

        <div className="row g-3">
          <div className="col-sm-4">
            <label className="form-label">
              Price (€) <span className="badge bg-danger ms-2">Required</span>
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
          <textarea
            className="form-control"
            rows={3}
            name="description"
            value={form.description}
            onChange={onChange}
          />
        </div>

        {/* Αν θες να ενεργοποιήσεις squareMeters στο UI, ξεκόμματαρε αυτό:
        <div className="mb-3">
          <label className="form-label">Square Meters</label>
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
        */}

        <h5 className="mt-3">Property Details</h5>
        <RequirementsForm values={requirements} setValues={setRequirements} />

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
