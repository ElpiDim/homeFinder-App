import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState([]);

  const [formData, setFormData] = useState({
    title: '', location: '', price: '', type: '', floor: '',
    squareMeters: '', surface: '', onTopFloor: false, levels: 1,
    bedrooms: 0, bathrooms: 0, wc: 0, kitchens: 0, livingRooms: 0,
    features: []
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'features') {
      setFormData((prev) => ({
        ...prev,
        features: checked
          ? [...prev.features, value]
          : prev.features.filter((f) => f !== value)
      }));
    } else if (type === 'radio' && name === 'onTopFloor') {
      setFormData((prev) => ({ ...prev, onTopFloor: value === 'yes' }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submissionData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => submissionData.append(key, v));
      } else {
        submissionData.append(key, value);
      }
    });
    images.forEach((img) => submissionData.append("images", img));

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/properties', submissionData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Property created!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error uploading property');
    }
  };

  if (!user || user.role !== 'owner') {
    return <p className="text-danger text-center mt-5">Only owners can add properties.</p>;
  }

  const roomControls = ['bedrooms', 'bathrooms', 'wc', 'kitchens', 'livingRooms'];
  const featureOptions = [
    'Parking spot', 'Elevator', 'Secure door', 'Alarm', 'Furnished',
    'Storage space', 'Fireplace', 'Balcony', 'Internal staircase',
    'Garden', 'Swimming pool', 'Playroom', 'Attic', 'View', 'Solar water heating'
  ];

  return (
    <div className="bg-light min-vh-100 py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '700px' }}>
        <h4 className="fw-bold mb-4">Add Property</h4>

        <form onSubmit={handleSubmit}>
          {[
            ['Title', 'title'], ['Location', 'location'], ['Price (€)', 'price'], ['Floor', 'floor'],
            ['Square Meters', 'squareMeters'], ['Property Surface (m²)', 'surface'], ['Levels', 'levels']
          ].map(([label, name]) => (
            <div className="mb-3" key={name}>
              <label className="form-label">{label}</label>
              <input name={name} type="text" className="form-control" onChange={handleChange} required={name === 'title' || name === 'location' || name === 'price'} />
            </div>
          ))}

          <div className="mb-3">
            <label className="form-label">Type</label>
            <select name="type" className="form-control" onChange={handleChange} required>
              <option value="">Select Type</option>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Is on Top Floor?</label>
            <div>
              <input type="radio" name="onTopFloor" value="yes" onChange={handleChange} /> Yes
              <input type="radio" name="onTopFloor" value="no" onChange={handleChange} className="ms-3" /> No
            </div>
          </div>

          <h5 className="mt-4">Rooms</h5>
          {roomControls.map((room) => (
            <div key={room} className="mb-2">
              <label className="form-label">{room.charAt(0).toUpperCase() + room.slice(1)}</label>
              <input
                name={room}
                type="number"
                className="form-control"
                onChange={handleChange}
              />
            </div>
          ))}

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
                />
                <label className="form-check-label" htmlFor={feature}>{feature}</label>
              </div>
            ))}
          </div>

          <div className="mb-4 mt-4">
            <label className="form-label">Upload Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              onChange={(e) => setImages([...e.target.files])}
              className="form-control"
            />
          </div>

          <div className="d-flex justify-content-between">
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProperty;
