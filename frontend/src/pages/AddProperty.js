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
    rent: '',
    sqm: '',
    bedrooms: '',
    bathrooms: '',
    furnished: false,
    parking: false,
    tenantRequirements: {
      occupation: '',
      income: '',
      familyStatus: 'any',
      pets: true,
      smoker: true,
    },
  });
  const [images, setImages] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const onReqsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({
      ...p,
      tenantRequirements: {
        ...p.tenantRequirements,
        [name]: type === 'checkbox' ? checked : value,
      },
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const fd = new FormData();
      for (const key in form) {
        if (key === 'tenantRequirements') {
          fd.append(key, JSON.stringify(form[key]));
        } else if (form[key] !== '' && form[key] !== null) {
          fd.append(key, form[key]);
        }
      }

      images.forEach(f => fd.append('images', f));

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
        {/* Property Details */}
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
            <label className="form-label">Rent (€/month)</label>
            <input type="number" className="form-control" name="rent" value={form.rent} onChange={onChange} required />
          </div>
          <div className="col-sm-4">
            <label className="form-label">Square Meters (sqm)</label>
            <input type="number" className="form-control" name="sqm" value={form.sqm} onChange={onChange} />
          </div>
           <div className="col-sm-4">
            <label className="form-label">Bedrooms</label>
            <input type="number" className="form-control" name="bedrooms" value={form.bedrooms} onChange={onChange} />
          </div>
        </div>
        <div className="mb-3 mt-3">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={3} name="description" value={form.description} onChange={onChange} />
        </div>

        {/* Tenant Requirements */}
        <h5 className="mt-3">Tenant Requirements</h5>
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label">Minimum Occupation</label>
            <input className="form-control" name="occupation" value={form.tenantRequirements.occupation} onChange={onReqsChange} />
          </div>
          <div className="col-sm-6">
            <label className="form-label">Minimum Income (€/month)</label>
            <input type="number" className="form-control" name="income" value={form.tenantRequirements.income} onChange={onReqsChange} />
          </div>
        </div>
        <div className="row g-3 mt-2">
          <div className="col-sm-4">
            <label className="form-label">Family Status</label>
            <select className="form-control" name="familyStatus" value={form.tenantRequirements.familyStatus} onChange={onReqsChange}>
              <option value="any">Any</option>
              <option value="single">Single</option>
              <option value="couple">Couple</option>
              <option value="family">Family</option>
            </select>
          </div>
          <div className="col-sm-4 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="pets" name="pets" checked={form.tenantRequirements.pets} onChange={onReqsChange} />
              <label className="form-check-label" htmlFor="pets">Pets Allowed</label>
            </div>
          </div>
          <div className="col-sm-4 d-flex align-items-end">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="smoker" name="smoker" checked={form.tenantRequirements.smoker} onChange={onReqsChange} />
              <label className="form-check-label" htmlFor="smoker">Smokers Allowed</label>
            </div>
          </div>
        </div>

        <div className="mb-3 mt-3">
          <label className="form-label">Images</label>
          <input type="file" className="form-control" multiple accept="image/*" onChange={(e) => setImages([...e.target.files])} />
        </div>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Create'}
        </button>
      </form>
    </div>
  );
}
