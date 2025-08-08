import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [formData, setFormData] = useState({
    title: '', location: '', price: '', type: '', floor: '',
    squareMeters: '', surface: '', onTopFloor: false, levels: '',
    bedrooms: '', bathrooms: '', wc: '', kitchens: '', livingRooms: '',
    status: '', features: []
  });

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await axios.get(`/api/properties/${propertyId}`);
        setFormData({
          title: res.data.title || '',
          location: res.data.location || '',
          price: res.data.price || '',
          type: res.data.type || '',
          floor: res.data.floor || '',
          squareMeters: res.data.squareMeters || '',
          surface: res.data.surface || '',
          onTopFloor: res.data.onTopFloor || false,
          levels: res.data.levels || '',
          bedrooms: res.data.bedrooms || '',
          bathrooms: res.data.bathrooms || '',
          wc: res.data.wc || '',
          kitchens: res.data.kitchens || '',
          livingRooms: res.data.livingRooms || '',
          status: res.data.status || '',
          features: res.data.features || []
        });
        setExistingImages(res.data.images || []);
      } catch (err) {
        console.error('Error fetching property:', err);
      }
    };
    fetchProperty();
  }, [propertyId]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageChange = (e) => {
    setNewImages([...e.target.files]);
  };

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

    newImages.forEach((img) => {
      submissionData.append('images', img);
    });

    try {
      await axios.put(`/api/properties/${propertyId}`, submissionData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      navigate(`/property/${propertyId}`);
    } catch (err) {
      console.error('❌ Error updating property:', err);
    }
  };

  return (
    <div className="bg-light min-vh-100 py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '700px' }}>
        <h4 className="fw-bold mb-4">Edit Property</h4>

        <form onSubmit={handleSubmit}>
          {[
            ['Title', 'title'], ['Location', 'location'], ['Price', 'price'], ['Floor', 'floor'],
            ['Square Meters', 'squareMeters'], ['Surface (m²)', 'surface'], ['Levels', 'levels'],
            ['Bedrooms', 'bedrooms'], ['Bathrooms', 'bathrooms'], ['WC', 'wc'],
            ['Kitchens', 'kitchens'], ['Living Rooms', 'livingRooms']
          ].map(([label, name]) => (
            <div className="mb-3" key={name}>
              <label className="form-label">{label}</label>
              <input type="text" name={name} value={formData[name]} onChange={handleChange} className="form-control" />
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
            <input type="checkbox" className="form-check-input" id="onTopFloor" checked={formData.onTopFloor}
              onChange={(e) => setFormData(prev => ({ ...prev, onTopFloor: e.target.checked }))} />
            <label className="form-check-label" htmlFor="onTopFloor">On Top Floor</label>
          </div>

          <div className="mb-3">
            <label className="form-label">Features</label>
            <div className="d-flex flex-wrap gap-3">
              {["parking", "elevator", "furnished", "fireplace", "airCondition", "solarWater", "secureDoor"].map((feature) => (
                <div className="form-check" key={feature}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={feature}
                    checked={formData.features.includes(feature)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...formData.features, feature]
                        : formData.features.filter(f => f !== feature);
                      setFormData(prev => ({ ...prev, features: updated }));
                    }}
                  />
                  <label className="form-check-label" htmlFor={feature}>{feature}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Existing Images</label>
            <div className="d-flex flex-wrap gap-2">
              {existingImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Existing ${idx}`}
                  style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '6px' }}
                />
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label">Add New Images</label>
            <input
              type="file"
              name="images"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              className="form-control"
            />
          </div>

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >Cancel</button>
            <button type="submit" className="btn btn-primary">Update Property</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProperty;
