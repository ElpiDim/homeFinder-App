// src/pages/AddProperty.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { tenantFields } from '../config/criteria';

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initReqs = () =>
    tenantFields.reduce(
      (acc, f) => ({ ...acc, [f.key]: f.type === 'checkbox' ? false : '' }),
      {}
    );

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    address: '',
    price: '',
    sqm: '',
    bedrooms: '',
    bathrooms: '',
    furnished: false,
    parking: false,
    tenantRequirements: initReqs(),
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
            <label className="form-label">price (€/month)</label>
            <input type="number" className="form-control" name="price" value={form.price} onChange={onChange} required />
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
          {tenantFields.map((f) => (
            <div
              key={f.key}
              className={
                f.type === 'checkbox'
                  ? 'col-sm-4 d-flex align-items-end'
                  : 'col-sm-6'
              }
            >
              {f.type === 'checkbox' ? (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name={f.key}
                    checked={form.tenantRequirements[f.key]}
                    onChange={onReqsChange}
                  />
                  <label className="form-check-label" htmlFor={f.key}>
                    {f.label}
                  </label>
                </div>
              ) : f.type === 'select' ? (
                <>
                  <label className="form-label">{f.label}</label>
                  <select
                    className="form-control"
                    name={f.key}
                    value={form.tenantRequirements[f.key]}
                    onChange={onReqsChange}
                  >
                    {f.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt || 'Any'}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="form-label">{f.label}</label>
                  <input
                    type={f.type}
                    className="form-control"
                    name={f.key}
                    value={form.tenantRequirements[f.key]}
                    onChange={onReqsChange}
                  />
                </>
              )}
            </div>
          ))}
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
