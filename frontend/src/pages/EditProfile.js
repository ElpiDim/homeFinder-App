// src/pages/EditProfile.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import TriStateSelect from '../components/TristateSelect';

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) =>
        v !== undefined &&
        v !== null &&
        v !== '' &&
        !(typeof v === 'number' && isNaN(v))
    )
  );

const toNumOrUndef = (v) =>
  v === '' || v === null || v === undefined ? undefined : Number(v);

const ensureRange = (min, max) => {
  const vmin = toNumOrUndef(min);
  const vmax = toNumOrUndef(max);
  if (vmin !== undefined && vmax !== undefined && vmin > vmax) {
    return { min: vmax, max: vmin }; // swap
  }
  return { min: vmin, max: vmax };
};

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isClient = user?.role === 'client';

  // Personal
  const [personal, setPersonal] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    age: user?.age ?? '',
    householdSize: user?.householdSize ?? '',
    hasFamily: !!user?.hasFamily,
    hasPets: !!user?.hasPets,
    smoker: !!user?.smoker,
    occupation: user?.occupation || '',
    salary: user?.salary ?? '',
    isWillingToHaveRoommate: !!user?.isWillingToHaveRoommate,
  });

  // Preferences (Client only)
  const [prefs, setPrefs] = useState({
    dealType:
      user?.preferences?.dealType ||
      (user?.preferences?.intent === 'buy' ? 'sale' : 'rent'),
    location: user?.preferences?.location || '',
    rentMin: user?.preferences?.rentMin ?? '',
    rentMax: user?.preferences?.rentMax ?? '',
    priceMin: user?.preferences?.priceMin ?? '',
    priceMax: user?.preferences?.priceMax ?? '',
    sqmMin: user?.preferences?.sqmMin ?? '',
    sqmMax: user?.preferences?.sqmMax ?? '',
    bedrooms: user?.preferences?.bedrooms ?? '',
    bathrooms: user?.preferences?.bathrooms ?? '',
    furnished: user?.preferences?.furnished ?? null,
    petsAllowed: user?.preferences?.petsAllowed ?? null,
    smokingAllowed: user?.preferences?.smokingAllowed ?? null,
    heatingType: user?.preferences?.heatingType || '',
    yearBuiltMin: user?.preferences?.yearBuiltMin ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'custom') setter((s) => ({ ...s, [name]: value }));
    else if (type === 'checkbox') setter((s) => ({ ...s, [name]: checked }));
    else setter((s) => ({ ...s, [name]: value }));
  };

  const validateClient = () => {
    const e = {};
    const pairs = [
      ['rentMin', 'rentMax'],
      ['priceMin', 'priceMax'],
      ['sqmMin', 'sqmMax'],
    ];
    pairs.forEach(([mi, ma]) => {
      const { min, max } = ensureRange(prefs[mi], prefs[ma]);
      if (min !== undefined && max !== undefined && min > max) {
        e[mi] = 'Min should be ≤ Max';
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert('You need to be logged in.');
    if (isClient && !validateClient()) return;

    setSaving(true);
    try {
      let payload;

      if (isClient) {
        const intent = prefs.dealType === 'sale' ? 'buy' : 'rent';
        const rent = ensureRange(prefs.rentMin, prefs.rentMax);
        const price = ensureRange(prefs.priceMin, prefs.priceMax);
        const sqm = ensureRange(prefs.sqmMin, prefs.sqmMax);

        const personalClean = clean({
          name: personal.name,
          phone: personal.phone,
          age: toNumOrUndef(personal.age),
          householdSize: toNumOrUndef(personal.householdSize),
          hasFamily: personal.hasFamily,
          hasPets: personal.hasPets,
          smoker: personal.smoker,
          occupation: personal.occupation,
          salary: toNumOrUndef(personal.salary),
          isWillingToHaveRoommate: personal.isWillingToHaveRoommate,
        });

        const prefsClean = clean({
          dealType: prefs.dealType,
          intent,
          location: prefs.location,
          ...(intent === 'rent'
            ? { rentMin: rent.min, rentMax: rent.max }
            : { priceMin: price.min, priceMax: price.max }),
          sqmMin: sqm.min,
          sqmMax: sqm.max,
          bedrooms: toNumOrUndef(prefs.bedrooms),
          bathrooms: toNumOrUndef(prefs.bathrooms),
          furnished: prefs.furnished === null ? undefined : !!prefs.furnished,
          petsAllowed: prefs.petsAllowed === null ? undefined : !!prefs.petsAllowed,
          smokingAllowed: prefs.smokingAllowed === null ? undefined : !!prefs.smokingAllowed,
          heatingType: prefs.heatingType || undefined,
          yearBuiltMin: toNumOrUndef(prefs.yearBuiltMin),
        });

        payload = clean({ ...personalClean, preferences: prefsClean });
      } else {
        payload = clean({
          name: personal.name,
          phone: personal.phone,
        });
      }

      const { data } = await api.patch('/users/me', payload);
      const updated = data?.user || data;
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      navigate('/profile', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      alert(`Save failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const pageGradient = useMemo(
    () => ({
      minHeight: '100vh',
      background:
        'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
         linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
    }),
    []
  );

  if (!user) {
    return (
      <div style={pageGradient} className="py-4">
        <div className="container" style={{ maxWidth: 960 }}>
          <div className="p-4 rounded-4 shadow-sm bg-white border">Loading…</div>
        </div>
      </div>
    );
  }

  const isRent = prefs.dealType !== 'sale';

  return (
    <div style={pageGradient} className="py-5">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="p-4 rounded-4 shadow-sm bg-white border">
          {/* Back */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <button
              className="btn btn-outline-secondary rounded-pill"
              onClick={() => navigate('/profile')}
            >
              ← Back
            </button>
            <h4 className="fw-bold mb-0">
              {isClient ? 'Edit Profile (Personal & Preferences)' : 'Edit Profile'}
            </h4>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Personal */}
            <h5 className="fw-bold mb-3">Personal Information</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="text-muted small">Name</label>
                <input
                  className="form-control"
                  name="name"
                  value={personal.name}
                  onChange={onChange(setPersonal)}
                />
              </div>
              <div className="col-md-6">
                <label className="text-muted small">Phone</label>
                <input
                  className="form-control"
                  name="phone"
                  value={personal.phone}
                  onChange={onChange(setPersonal)}
                />
              </div>
            </div>

            {isClient && (
              <>
                <div className="row g-3 mt-0">
                  <div className="col-md-3">
                    <label className="text-muted small">Age</label>
                    <input
                      type="number"
                      className="form-control"
                      name="age"
                      value={personal.age}
                      onChange={onChange(setPersonal)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Household Size</label>
                    <input
                      type="number"
                      className="form-control"
                      name="householdSize"
                      value={personal.householdSize}
                      onChange={onChange(setPersonal)}
                    />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="hasFamily"
                        name="hasFamily"
                        checked={personal.hasFamily}
                        onChange={onChange(setPersonal)}
                      />
                      <label htmlFor="hasFamily" className="form-check-label">Has family</label>
                    </div>
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="hasPets"
                        name="hasPets"
                        checked={personal.hasPets}
                        onChange={onChange(setPersonal)}
                      />
                      <label htmlFor="hasPets" className="form-check-label">Has pets</label>
                    </div>
                  </div>
                </div>

                {/* More personal */}
                <div className="row g-3 mt-0">
                  <div className="col-md-3 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="smoker"
                        name="smoker"
                        checked={personal.smoker}
                        onChange={onChange(setPersonal)}
                      />
                      <label htmlFor="smoker" className="form-check-label">Smoker</label>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <label className="text-muted small">Occupation</label>
                    <input
                      className="form-control"
                      name="occupation"
                      value={personal.occupation}
                      onChange={onChange(setPersonal)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="text-muted small">Salary (€)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="salary"
                      value={personal.salary}
                      onChange={onChange(setPersonal)}
                    />
                  </div>
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-md-6 d-flex align-items-end">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="roommate"
                        name="isWillingToHaveRoommate"
                        checked={personal.isWillingToHaveRoommate}
                        onChange={onChange(setPersonal)}
                      />
                      <label htmlFor="roommate" className="form-check-label">
                        I’m willing to have a roommate
                      </label>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <h5 className="fw-bold mt-4 mb-3">Preferences</h5>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="text-muted small">I’m interested in</label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="dealTypeRent"
                          name="dealType"
                          value="rent"
                          checked={prefs.dealType === 'rent'}
                          onChange={onChange(setPrefs)}
                        />
                        <label className="form-check-label" htmlFor="dealTypeRent">Renting</label>
                      </div>
                      <div className="form-check">
                        <input
                          type="radio"
                          className="form-check-input"
                          id="dealTypeSale"
                          name="dealType"
                          value="sale"
                          checked={prefs.dealType === 'sale'}
                          onChange={onChange(setPrefs)}
                        />
                        <label className="form-check-label" htmlFor="dealTypeSale">Buying</label>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="text-muted small">Location</label>
                    <input
                      className="form-control"
                      name="location"
                      value={prefs.location}
                      onChange={onChange(setPrefs)}
                    />
                  </div>

                  {/* Budget */}
                  {isRent ? (
                    <>
                      <div className="col-md-3">
                        <label className="text-muted small">Rent Min (€)</label>
                        <input
                          type="number"
                          className={`form-control ${errors.rentMin ? 'is-invalid' : ''}`}
                          name="rentMin"
                          value={prefs.rentMin}
                          onChange={onChange(setPrefs)}
                        />
                        {errors.rentMin && <div className="invalid-feedback">{errors.rentMin}</div>}
                      </div>
                      <div className="col-md-3">
                        <label className="text-muted small">Rent Max (€)</label>
                        <input
                          type="number"
                          className="form-control"
                          name="rentMax"
                          value={prefs.rentMax}
                          onChange={onChange(setPrefs)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="col-md-3">
                        <label className="text-muted small">Purchase Min (€)</label>
                        <input
                          type="number"
                          className={`form-control ${errors.priceMin ? 'is-invalid' : ''}`}
                          name="priceMin"
                          value={prefs.priceMin}
                          onChange={onChange(setPrefs)}
                        />
                        {errors.priceMin && <div className="invalid-feedback">{errors.priceMin}</div>}
                      </div>
                      <div className="col-md-3">
                        <label className="text-muted small">Purchase Max (€)</label>
                        <input
                          type="number"
                          className="form-control"
                          name="priceMax"
                          value={prefs.priceMax}
                          onChange={onChange(setPrefs)}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-md-3">
                    <label className="text-muted small">Sqm Min</label>
                    <input
                      type="number"
                      className={`form-control ${errors.sqmMin ? 'is-invalid' : ''}`}
                      name="sqmMin"
                      value={prefs.sqmMin}
                      onChange={onChange(setPrefs)}
                    />
                    {errors.sqmMin && <div className="invalid-feedback">{errors.sqmMin}</div>}
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Sqm Max</label>
                    <input
                      type="number"
                      className="form-control"
                      name="sqmMax"
                      value={prefs.sqmMax}
                      onChange={onChange(setPrefs)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Bedrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      name="bedrooms"
                      value={prefs.bedrooms}
                      onChange={onChange(setPrefs)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Bathrooms</label>
                    <input
                      type="number"
                      className="form-control"
                      name="bathrooms"
                      value={prefs.bathrooms}
                      onChange={onChange(setPrefs)}
                    />
                  </div>
                </div>

                {/* Tri-state */}
                <div className="row g-3 mt-0">
                  <div className="col-md-3">
                    <TriStateSelect label="Furnished" name="furnished" value={prefs.furnished} onChange={onChange(setPrefs)} />
                  </div>
                  <div className="col-md-3">
                    <TriStateSelect label="Pets allowed" name="petsAllowed" value={prefs.petsAllowed} onChange={onChange(setPrefs)} />
                  </div>
                  <div className="col-md-3">
                    <TriStateSelect label="Smoking allowed" name="smokingAllowed" value={prefs.smokingAllowed} onChange={onChange(setPrefs)} />
                  </div>
                  <div className="col-md-3">
                    <label className="text-muted small">Heating Type</label>
                    <select
                      className="form-select"
                      name="heatingType"
                      value={prefs.heatingType}
                      onChange={onChange(setPrefs)}
                    >
                      <option value="">Select</option>
                      <option value="autonomous">Autonomous</option>
                      <option value="central">Central</option>
                      <option value="ac">AC</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3 mt-0">
                  <div className="col-md-3">
                    <label className="text-muted small">Year Built Min</label>
                    <input
                      type="number"
                      className="form-control"
                      name="yearBuiltMin"
                      value={prefs.yearBuiltMin}
                      onChange={onChange(setPrefs)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="mt-4 d-flex justify-content-end">
              <button
                type="submit"
                className="btn rounded-pill px-4"
                style={{
                  background: "linear-gradient(135deg,#006400,#90ee90)",
                  color: "#fff",
                  fontWeight: 600,
                  border: "none"
                }}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
