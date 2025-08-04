import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    location: '',
    price: '',
    type: '',
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
    status: '',
    features: []
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
    <div className="container mt-4">
      <h2>Edit Property</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-3"><label>Title</label><input type="text" name="title" value={formData.title} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Location</label><input type="text" name="location" value={formData.location} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Price</label><input type="number" name="price" value={formData.price} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Type</label>
          <select name="type" value={formData.type} onChange={handleChange} className="form-control">
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>
        </div>
        <div className="mb-3"><label>Floor</label><input type="number" name="floor" value={formData.floor} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Square Meters</label><input type="number" name="squareMeters" value={formData.squareMeters} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Surface (m²)</label><input type="number" name="surface" value={formData.surface} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3 form-check">
          <input type="checkbox" className="form-check-input" id="onTopFloor" checked={formData.onTopFloor}
            onChange={(e) => setFormData(prev => ({ ...prev, onTopFloor: e.target.checked }))} />
          <label className="form-check-label" htmlFor="onTopFloor">On Top Floor</label>
        </div>
        <div className="mb-3"><label>Levels</label><input type="number" name="levels" value={formData.levels} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Bedrooms</label><input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Bathrooms</label><input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>WC</label><input type="number" name="wc" value={formData.wc} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Kitchens</label><input type="number" name="kitchens" value={formData.kitchens} onChange={handleChange} className="form-control" /></div>
        <div className="mb-3"><label>Living Rooms</label><input type="number" name="livingRooms" value={formData.livingRooms} onChange={handleChange} className="form-control" /></div>

        <div className="mb-3">
          <label>Features</label>
          <div className="d-flex flex-wrap gap-3">
            {["parking", "elevator", "furnished", "fireplace", "airCondition", "solarWater", "secureDoor"].map((feature) => (
              <div className="form-check" key={feature}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={feature}
                  checked={formData.features?.includes(feature)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...(formData.features || []), feature]
                      : (formData.features || []).filter(f => f !== feature);
                    setFormData(prev => ({ ...prev, features: updated }));
                  }}
                />
                <label className="form-check-label" htmlFor={feature}>{feature}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3"><label>Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="form-control">
            <option value="available">Available</option>
            <option value="rented">Rented</option>
            <option value="sold">Sold</option>
          </select>
        </div>

        <div className="mb-3">
          <label>Existing Images</label>
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

        <div className="mb-3">
          <label>Add New Images</label>
          <input
            type="file"
            name="images"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            className="form-control"
          />
        </div>

        <button type="submit" className="btn btn-primary">Update Property</button>
      </form>
    </div>
  );
}

export default EditProperty;
