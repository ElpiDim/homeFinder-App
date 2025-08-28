import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  if (!user) return <div className="container mt-4">Loading...</div>;

  const isClient = user.role === 'client';

  const [form, setForm] = useState(
    isClient
      ? {
          location: '',
          rentMin: '',
          rentMax: '',
          sqmMin: '',
          sqmMax: '',
          bedrooms: '',
          bathrooms: '',
          furnished: false,
          petsAllowed: false,
          smokingAllowed: false,
          yearBuiltMin: '',
          heatingType: '',
        }
      : {
          incomeMin: '',
          incomeMax: '',
          allowedOccupations: '',
          familyStatus: '',
          petsAllowed: false,
          smokingAllowed: false,
          workLocation: '',
          preferredTenantRegion: '',
        }
  );

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();

    try {
      let res;
      if (isClient) {
        const preferences = {
          location: form.location || undefined,
          minPrice: form.rentMin ? Number(form.rentMin) : undefined,
          maxPrice: form.rentMax ? Number(form.rentMax) : undefined,
          minSqm: form.sqmMin ? Number(form.sqmMin) : undefined,
          maxSqm: form.sqmMax ? Number(form.sqmMax) : undefined,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
          furnished: form.furnished,
          petsAllowed: form.petsAllowed,
          smokingAllowed: form.smokingAllowed,
        };

        Object.keys(preferences).forEach((k) => preferences[k] === undefined && delete preferences[k]);

        res = await api.put('/users/me/preferences', {
          ...preferences,
          completeOnboarding: true,
        });
      } else {
        // Owners currently only complete onboarding without storing additional fields
        res = await api.put('/users/me/preferences', {
          completeOnboarding: true,
        });
      }

      const updated = res.data.user || res.data;
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      navigate('/dashboard');
    } catch (err) {
      console.error('onboarding failed', err);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Onboarding</h3>
      <form onSubmit={submit}>
        {isClient ? (
          <>
            <div className="mb-3">
              <label className="form-label">Location</label>
              <input className="form-control" name="location" value={form.location} onChange={onChange} />
            </div>
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label">Rent Min</label>
                <input type="number" className="form-control" name="rentMin" value={form.rentMin} onChange={onChange} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Rent Max</label>
                <input type="number" className="form-control" name="rentMax" value={form.rentMax} onChange={onChange} />
              </div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-sm-6">
                <label className="form-label">Sqm Min</label>
                <input type="number" className="form-control" name="sqmMin" value={form.sqmMin} onChange={onChange} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Sqm Max</label>
                <input type="number" className="form-control" name="sqmMax" value={form.sqmMax} onChange={onChange} />
              </div>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-sm-6">
                <label className="form-label">Bedrooms</label>
                <input type="number" className="form-control" name="bedrooms" value={form.bedrooms} onChange={onChange} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Bathrooms</label>
                <input type="number" className="form-control" name="bathrooms" value={form.bathrooms} onChange={onChange} />
              </div>
            </div>
            <div className="form-check mt-3">
              <input className="form-check-input" type="checkbox" name="furnished" id="furnished" checked={form.furnished} onChange={onChange} />
              <label className="form-check-label" htmlFor="furnished">Furnished</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="petsAllowed" id="petsAllowed" checked={form.petsAllowed} onChange={onChange} />
              <label className="form-check-label" htmlFor="petsAllowed">Pets Allowed</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="smokingAllowed" id="smokingAllowed" checked={form.smokingAllowed} onChange={onChange} />
              <label className="form-check-label" htmlFor="smokingAllowed">Smoking Allowed</label>
            </div>
            <div className="row g-3 mt-1">
              <div className="col-sm-6">
                <label className="form-label">Year Built Min</label>
                <input type="number" className="form-control" name="yearBuiltMin" value={form.yearBuiltMin} onChange={onChange} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Heating Type</label>
                <input className="form-control" name="heatingType" value={form.heatingType} onChange={onChange} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="row g-3">
              <div className="col-sm-6">
                <label className="form-label">Income Min</label>
                <input type="number" className="form-control" name="incomeMin" value={form.incomeMin} onChange={onChange} />
              </div>
              <div className="col-sm-6">
                <label className="form-label">Income Max</label>
                <input type="number" className="form-control" name="incomeMax" value={form.incomeMax} onChange={onChange} />
              </div>
            </div>
            <div className="mb-3 mt-1">
              <label className="form-label">Allowed Occupations (comma separated)</label>
              <input className="form-control" name="allowedOccupations" value={form.allowedOccupations} onChange={onChange} />
            </div>
            <div className="mb-3">
              <label className="form-label">Family Status</label>
              <input className="form-control" name="familyStatus" value={form.familyStatus} onChange={onChange} />
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="petsAllowed" id="ownerPets" checked={form.petsAllowed} onChange={onChange} />
              <label className="form-check-label" htmlFor="ownerPets">Pets Allowed</label>
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" name="smokingAllowed" id="ownerSmoking" checked={form.smokingAllowed} onChange={onChange} />
              <label className="form-check-label" htmlFor="ownerSmoking">Smoking Allowed</label>
            </div>
            <div className="mb-3 mt-1">
              <label className="form-label">Work Location</label>
              <input className="form-control" name="workLocation" value={form.workLocation} onChange={onChange} />
            </div>
            <div className="mb-3">
              <label className="form-label">Preferred Tenant Region</label>
              <input className="form-control" name="preferredTenantRegion" value={form.preferredTenantRegion} onChange={onChange} />
            </div>
          </>
        )}
        <button className="btn btn-primary mt-3" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
