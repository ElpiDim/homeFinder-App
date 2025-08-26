import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser, updateCurrentUser, updatePreferences } from '../services/userService';

function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // --- Personal (user) fields ---
  const [formData, setFormData] = useState({
    age: '',
    householdSize: 1,
    hasFamily: false,
    hasPets: false,
    smoker: false,
    occupation: '',
    salary: '',
    isWillingToHaveRoommate: false,
  });

  // --- Preferences (apartment) ---
  const [prefData, setPrefData] = useState({
    type: 'rent',
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
  const [saving, setSaving] = useState(false);

  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #006400 0%, #228b22 33%, #32cd32 66%, #90ee90 100%)',
  }), []);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCurrentUser();
        // personal
        setFormData({
          age: data.age ?? '',
          householdSize: data.householdSize ?? 1,
          hasFamily: !!data.hasFamily,
          hasPets: !!data.hasPets,
          smoker: !!data.smoker,
          occupation: data.occupation || '',
          salary: data.salary ?? '',
          isWillingToHaveRoommate: !!data.isWillingToHaveRoommate,
        });
        // preferences
        const p = data.preferences || {};
        setPrefData({
          type: p.type || 'rent',
          location: p.location || '',
          minPrice: p.minPrice ?? '',
          maxPrice: p.maxPrice ?? '',
          minSqm: p.minSqm ?? '',
          maxSqm: p.maxSqm ?? '',
          bedrooms: p.bedrooms ?? '',
          bathrooms: p.bathrooms ?? '',
          petsAllowed: !!p.petsAllowed,
          smokingAllowed: !!p.smokingAllowed,
          furnished: !!p.furnished,
        });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error('load user failed', err);
      }
    })();
  }, [setUser]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePrefChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPrefData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      // 1) Update personal profile
      const payloadUser = {
        age: formData.age !== '' ? Number(formData.age) : undefined,
        householdSize: formData.householdSize !== '' ? Number(formData.householdSize) : undefined,
        hasFamily: formData.hasFamily,
        hasPets: formData.hasPets,
        smoker: formData.smoker,
        occupation: formData.occupation,
        salary: formData.salary !== '' ? Number(formData.salary) : undefined,
        isWillingToHaveRoommate: !!formData.isWillingToHaveRoommate,
      };

      // ❗ ΠΑΙΡΝΟΥΜΕ ΤΟΝ UPDATED USER ΚΑΙ ΤΟΝ ΠΕΡΝΑΜΕ ΣΤΟ CONTEXT
      const updatedUser = await updateCurrentUser(payloadUser);
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // 2) Update preferences (+ mark onboarding complete if 1η φορά)
      const payloadPref = {
        type: prefData.type,
        location: prefData.location || undefined,
        minPrice: prefData.minPrice !== '' ? Number(prefData.minPrice) : undefined,
        maxPrice: prefData.maxPrice !== '' ? Number(prefData.maxPrice) : undefined,
        minSqm: prefData.minSqm !== '' ? Number(prefData.minSqm) : undefined,
        maxSqm: prefData.maxSqm !== '' ? Number(prefData.maxSqm) : undefined,
        bedrooms: prefData.bedrooms !== '' ? Number(prefData.bedrooms) : undefined,
        bathrooms: prefData.bathrooms !== '' ? Number(prefData.bathrooms) : undefined,
        petsAllowed: !!prefData.petsAllowed,
        smokingAllowed: !!prefData.smokingAllowed,
        furnished: !!prefData.furnished,
        completeOnboarding: !(user?.hasCompletedOnboarding),
      };

      const res = await updatePreferences(payloadPref);
      if (res?.user) {
        setUser(res.user);
        localStorage.setItem('user', JSON.stringify(res.user));
      }

      setMessage('Profile updated successfully!');
      // 3) Redirect always to dashboard
      navigate('/dashboard');

    } catch (err) {
      console.error('update failed', err);
      setMessage(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageGradient} className="py-4">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: 960 }}>
        <h3 className="fw-bold mb-3">Edit Profile</h3>
        {message && <div className="alert alert-info">{message}</div>}

        <form onSubmit={handleSubmit}>
          {/* --- Personal --- */}
          <h5 className="fw-bold">Personal</h5>
          <div className="row g-3">
            <div className="col-sm-3">
              <label className="form-label">Age</label>
              <input type="number" name="age" className="form-control" value={formData.age} onChange={handleChange} min={0} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Household Size</label>
              <input type="number" name="householdSize" className="form-control" value={formData.householdSize} onChange={handleChange} min={1} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Occupation</label>
              <input type="text" name="occupation" className="form-control" value={formData.occupation} onChange={handleChange} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Salary (€)/year</label>
              <input type="number" name="salary" className="form-control" value={formData.salary} onChange={handleChange} min={0} />
            </div>
          </div>

          <div className="d-flex gap-4 mt-2">
            <div className="form-check">
              <input type="checkbox" name="hasFamily" className="form-check-input" checked={formData.hasFamily} onChange={handleChange} id="hasFamily" />
              <label className="form-check-label" htmlFor="hasFamily">Has Family</label>
            </div>
            <div className="form-check">
              <input type="checkbox" name="hasPets" className="form-check-input" checked={formData.hasPets} onChange={handleChange} id="hasPets" />
              <label className="form-check-label" htmlFor="hasPets">Has Pets</label>
            </div>
            <div className="form-check">
              <input type="checkbox" name="smoker" className="form-check-input" checked={formData.smoker} onChange={handleChange} id="smoker" />
              <label className="form-check-label" htmlFor="smoker">Smoker</label>
            </div>
            <div className="form-check">
              <input type="checkbox" name="isWillingToHaveRoommate" className="form-check-input" checked={formData.isWillingToHaveRoommate} onChange={handleChange} id="roommate" />
              <label className="form-check-label" htmlFor="roommate">Willing to have roommate</label>
            </div>
          </div>

          {/* --- Preferences --- */}
          <hr className="my-4" />
          <h5 className="fw-bold">Apartment Preferences</h5>

          <div className="row g-3">
            <div className="col-sm-3">
              <label className="form-label">Type</label>
              <select name="type" className="form-control" value={prefData.type} onChange={handlePrefChange}>
                <option value="rent">Rent</option>
                <option value="sale">Sale</option>
              </select>
            </div>
            <div className="col-sm-9">
              <label className="form-label">Preferred location</label>
              <input name="location" className="form-control" value={prefData.location} onChange={handlePrefChange} placeholder="e.g. Nea Smyrni" />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-3">
              <label className="form-label">Min price (€)</label>
              <input type="number" name="minPrice" className="form-control" value={prefData.minPrice} onChange={handlePrefChange} min={0} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Max price (€)</label>
              <input type="number" name="maxPrice" className="form-control" value={prefData.maxPrice} onChange={handlePrefChange} min={0} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Min sqm</label>
              <input type="number" name="minSqm" className="form-control" value={prefData.minSqm} onChange={handlePrefChange} min={0} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Max sqm</label>
              <input type="number" name="maxSqm" className="form-control" value={prefData.maxSqm} onChange={handlePrefChange} min={0} />
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-sm-3">
              <label className="form-label">Bedrooms</label>
              <input type="number" name="bedrooms" className="form-control" value={prefData.bedrooms} onChange={handlePrefChange} min={0} />
            </div>
            <div className="col-sm-3">
              <label className="form-label">Bathrooms</label>
              <input type="number" name="bathrooms" className="form-control" value={prefData.bathrooms} onChange={handlePrefChange} min={0} />
            </div>
            <div className="col-sm-6 d-flex align-items-end gap-4">
              <div className="form-check">
                <input id="prefPets" className="form-check-input" type="checkbox" name="petsAllowed" checked={prefData.petsAllowed} onChange={handlePrefChange} />
                <label className="form-check-label" htmlFor="prefPets">Pets allowed</label>
              </div>
              <div className="form-check">
                <input id="prefSmoke" className="form-check-input" type="checkbox" name="smokingAllowed" checked={prefData.smokingAllowed} onChange={handlePrefChange} />
                <label className="form-check-label" htmlFor="prefSmoke">Smoking allowed</label>
              </div>
              <div className="form-check">
                <input id="prefFurn" className="form-check-input" type="checkbox" name="furnished" checked={prefData.furnished} onChange={handlePrefChange} />
                <label className="form-check-label" htmlFor="prefFurn">Furnished</label>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn btn-secondary ms-2"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
