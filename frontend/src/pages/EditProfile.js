import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser, updateCurrentUser, updatePreferences } from '../services';

function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [personal, setPersonal] = useState({
    age: '',
    householdSize: 1,
    hasFamily: false,
    hasPets: false,
    smoker: false,
    occupation: '',
    salary: '',
    isWillingToHaveRoommate: false,
  });

  const [prefs, setPrefs] = useState({
    type: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    minSqm: '',
    maxSqm: '',
    bedrooms: '',
    bathrooms: '',
    petsAllowed: false,
    smokingAllowed: false,
    furnished: false,
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUser();
        setPersonal({
          age: data.age || '',
          householdSize: data.householdSize || 1,
          hasFamily: data.hasFamily || false,
          hasPets: data.hasPets || false,
          smoker: data.smoker || false,
          occupation: data.occupation || '',
          salary: data.salary || '',
          isWillingToHaveRoommate: data.isWillingToHaveRoommate || false,
        });
        const p = data.preferences || {};
        setPrefs({
          type: p.type || '',
          location: p.location || '',
          minPrice: p.minPrice || '',
          maxPrice: p.maxPrice || '',
          minSqm: p.minSqm || '',
          maxSqm: p.maxSqm || '',
          bedrooms: p.bedrooms || '',
          bathrooms: p.bathrooms || '',
          petsAllowed: p.petsAllowed || false,
          smokingAllowed: p.smokingAllowed || false,
          furnished: p.furnished || false,
        });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [setUser]);

  const handlePersonalChange = (e) => {
    const { name, type, value, checked } = e.target;
    setPersonal((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePrefsChange = (e) => {
    const { name, type, value, checked } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateCurrentUser(personal);
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      const payload = { ...prefs };
      if (!updated.hasCompletedOnboarding) {
        payload.completeOnboarding = true;
      }
      const prefRes = await updatePreferences(payload);
      const newUser = prefRes.user || prefRes;
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

      setMessage('Profile updated successfully');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Edit Profile</h3>
      {message && <div className="alert alert-success">{message}</div>}
      <form onSubmit={handleSubmit}>
        <h5>Personal Information</h5>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Age</label>
            <input type="number" name="age" className="form-control" value={personal.age} onChange={handlePersonalChange} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Household Size</label>
            <input type="number" name="householdSize" className="form-control" value={personal.householdSize} onChange={handlePersonalChange} />
          </div>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="hasFamily" className="form-check-input" checked={personal.hasFamily} onChange={handlePersonalChange} />
          <label className="form-check-label">Has Family</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="hasPets" className="form-check-input" checked={personal.hasPets} onChange={handlePersonalChange} />
          <label className="form-check-label">Has Pets</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="smoker" className="form-check-input" checked={personal.smoker} onChange={handlePersonalChange} />
          <label className="form-check-label">Smoker</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="isWillingToHaveRoommate" className="form-check-input" checked={personal.isWillingToHaveRoommate} onChange={handlePersonalChange} />
          <label className="form-check-label">Willing to have roommate</label>
        </div>
        <div className="mb-3">
          <label className="form-label">Occupation</label>
          <input type="text" name="occupation" className="form-control" value={personal.occupation} onChange={handlePersonalChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Salary</label>
          <input type="number" name="salary" className="form-control" value={personal.salary} onChange={handlePersonalChange} />
        </div>

        <h5 className="mt-4">Preferences</h5>
        <div className="mb-3">
          <label className="form-label">Type</label>
          <input type="text" name="type" className="form-control" value={prefs.type} onChange={handlePrefsChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Location</label>
          <input type="text" name="location" className="form-control" value={prefs.location} onChange={handlePrefsChange} />
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Min Price</label>
            <input type="number" name="minPrice" className="form-control" value={prefs.minPrice} onChange={handlePrefsChange} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Max Price</label>
            <input type="number" name="maxPrice" className="form-control" value={prefs.maxPrice} onChange={handlePrefsChange} />
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Min Sqm</label>
            <input type="number" name="minSqm" className="form-control" value={prefs.minSqm} onChange={handlePrefsChange} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Max Sqm</label>
            <input type="number" name="maxSqm" className="form-control" value={prefs.maxSqm} onChange={handlePrefsChange} />
          </div>
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Bedrooms</label>
            <input type="number" name="bedrooms" className="form-control" value={prefs.bedrooms} onChange={handlePrefsChange} />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Bathrooms</label>
            <input type="number" name="bathrooms" className="form-control" value={prefs.bathrooms} onChange={handlePrefsChange} />
          </div>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="petsAllowed" className="form-check-input" checked={prefs.petsAllowed} onChange={handlePrefsChange} />
          <label className="form-check-label">Pets Allowed</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="smokingAllowed" className="form-check-input" checked={prefs.smokingAllowed} onChange={handlePrefsChange} />
          <label className="form-check-label">Smoking Allowed</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="furnished" className="form-check-input" checked={prefs.furnished} onChange={handlePrefsChange} />
          <label className="form-check-label">Furnished</label>
        </div>
        <button type="submit" className="btn btn-primary mt-3">Save</button>
      </form>
    </div>
  );
}

export default EditProfile;