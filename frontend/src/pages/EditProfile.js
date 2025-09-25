// src/pages/EditProfile.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';
// FIX: correct component name/path
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

  // Preferences (TENANT can edit)
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
    furnished: user?.preferences?.furnished ?? null,          // tri-state
    petsAllowed: user?.preferences?.petsAllowed ?? null,      // tri-state
    smokingAllowed: user?.preferences?.smokingAllowed ?? null,// tri-state
    heatingType: user?.preferences?.heatingType || '',
    // keep in sync with Profile.jsx
    yearBuiltMin: user?.preferences?.yearBuiltMin ?? '',
  });

  // Owner-only requirements (unchanged)
  const [reqs, setReqs] = useState({
    incomeMin: user?.requirements?.incomeMin ?? '',
    incomeMax: user?.requirements?.incomeMax ?? '',
    allowedOccupations: (user?.requirements?.allowedOccupations || []).join(', '),
    familyStatus: user?.requirements?.familyStatus || '',
    petsAllowed: !!user?.requirements?.petsAllowed,
    smokingAllowed: !!user?.requirements?.smokingAllowed,
    workLocation: user?.requirements?.workLocation || '',
    preferredTenantRegion: user?.requirements?.preferredTenantRegion || '',
  });

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'custom') setter((s) => ({ ...s, [name]: value })); // from TriStateSelect
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
          dealType: prefs.dealType, // FE compatibility if needed
          intent,                   // backend uses this for matching
          location: prefs.location,
          ...(intent === 'rent'
            ? { rentMin: rent.min, rentMax: rent.max }
            : { priceMin: price.min, priceMax: price.max }),
          sqmMin: sqm.min,
          sqmMax: sqm.max,
          bedrooms: toNumOrUndef(prefs.bedrooms),
          bathrooms: toNumOrUndef(prefs.bathrooms),
          // tri-state → undefined when no preference
          furnished: prefs.furnished === null ? undefined : !!prefs.furnished,
          petsAllowed: prefs.petsAllowed === null ? undefined : !!prefs.petsAllowed,
          smokingAllowed: prefs.smokingAllowed === null ? undefined : !!prefs.smokingAllowed,
          heatingType: prefs.heatingType || undefined,
          yearBuiltMin: toNumOrUndef(prefs.yearBuiltMin),
        });

        payload = clean({ ...personalClean, preferences: prefsClean });
      } else {
        const reqsClean = clean({
          incomeMin: toNumOrUndef(reqs.incomeMin),
          incomeMax: toNumOrUndef(reqs.incomeMax),
          allowedOccupations: reqs.allowedOccupations
            ? reqs.allowedOccupations.split(',').map((o) => o.trim()).filter(Boolean)
            : [],
          familyStatus: reqs.familyStatus || undefined,
          petsAllowed: !!reqs.petsAllowed,
          smokingAllowed: !!reqs.smokingAllowed,
          workLocation: reqs.workLocation || undefined,
          preferredTenantRegion: reqs.preferredTenantRegion || undefined,
        });

        payload = clean({ requirements: reqsClean });
      }

      const { data } = await api.patch('/users/me', payload);
      const updated = data?.user || data;
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      navigate('/profile', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message;
      alert(`Save failed: ${status || '?'} - ${msg}`);
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
          <Card><Card.Body>Loading…</Card.Body></Card>
        </div>
      </div>
    );
  }

  const isRent = prefs.dealType !== 'sale';

  return (
    <div style={pageGradient} className="py-4">
      <div className="container" style={{ maxWidth: 960 }}>
        <Card>
          <Card.Body>
            {/* Back button */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <Button variant="outline-secondary" onClick={() => navigate('/profile')}>
                ← 
              </Button>
            </div>

            <Card.Title className="mb-3">
              {isClient ? 'Edit Profile (Personal & Preferences)' : 'Edit Requirements'}
            </Card.Title>

            <Form onSubmit={handleSubmit}>
              {isClient ? (
                <>
                  {/* Personal */}
                  <h5>Personal Information</h5>
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Name</Form.Label>
                        <Form.Control name="name" value={personal.name} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Phone</Form.Label>
                        <Form.Control name="phone" value={personal.phone} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Age</Form.Label>
                        <Form.Control type="number" name="age" value={personal.age} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Household Size</Form.Label>
                        <Form.Control type="number" name="householdSize" value={personal.householdSize} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check label="Has family" name="hasFamily" checked={personal.hasFamily} onChange={onChange(setPersonal)} />
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check label="Has pets" name="hasPets" checked={personal.hasPets} onChange={onChange(setPersonal)} />
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check label="Smoker" name="smoker" checked={personal.smoker} onChange={onChange(setPersonal)} />
                    </Col>
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label>Occupation</Form.Label>
                        <Form.Control name="occupation" value={personal.occupation} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Salary (€)</Form.Label>
                        <Form.Control type="number" name="salary" value={personal.salary} onChange={onChange(setPersonal)} />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={6} className="d-flex align-items-end">
                      <Form.Check
                        label="I’m willing to have a roommate"
                        name="isWillingToHaveRoommate"
                        checked={personal.isWillingToHaveRoommate}
                        onChange={onChange(setPersonal)}
                      />
                    </Col>
                  </Row>

                  {/* Preferences */}
                  <h5 className="mt-4">Preferences</h5>
                  <Row className="g-3">
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label>I’m interested in</Form.Label>
                        <div className="d-flex gap-4">
                          <Form.Check
                            type="radio"
                            id="edit-dealType-rent"
                            name="dealType"
                            value="rent"
                            label="Renting"
                            checked={prefs.dealType === 'rent'}
                            onChange={onChange(setPrefs)}
                          />
                          <Form.Check
                            type="radio"
                            id="edit-dealType-sale"
                            name="dealType"
                            value="sale"
                            label="Buying"
                            checked={prefs.dealType === 'sale'}
                            onChange={onChange(setPrefs)}
                          />
                        </div>
                      </Form.Group>
                    </Col>

                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Location</Form.Label>
                        <Form.Control name="location" value={prefs.location} onChange={onChange(setPrefs)} />
                      </Form.Group>
                    </Col>

                    {/* Budget */}
                    {isRent ? (
                      <>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>Rent Min (€)</Form.Label>
                            <Form.Control
                              type="number"
                              name="rentMin"
                              value={prefs.rentMin}
                              onChange={onChange(setPrefs)}
                              isInvalid={!!errors.rentMin}
                            />
                            <Form.Control.Feedback type="invalid">{errors.rentMin}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>Rent Max (€)</Form.Label>
                            <Form.Control type="number" name="rentMax" value={prefs.rentMax} onChange={onChange(setPrefs)} />
                          </Form.Group>
                        </Col>
                      </>
                    ) : (
                      <>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>Purchase Min (€)</Form.Label>
                            <Form.Control
                              type="number"
                              name="priceMin"
                              value={prefs.priceMin}
                              onChange={onChange(setPrefs)}
                              isInvalid={!!errors.priceMin}
                            />
                            <Form.Control.Feedback type="invalid">{errors.priceMin}</Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col md={3}>
                          <Form.Group>
                            <Form.Label>Purchase Max (€)</Form.Label>
                            <Form.Control type="number" name="priceMax" value={prefs.priceMax} onChange={onChange(setPrefs)} />
                          </Form.Group>
                        </Col>
                      </>
                    )}
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Sqm Min</Form.Label>
                        <Form.Control
                          type="number"
                          name="sqmMin"
                          value={prefs.sqmMin}
                          onChange={onChange(setPrefs)}
                          isInvalid={!!errors.sqmMin}
                        />
                        <Form.Control.Feedback type="invalid">{errors.sqmMin}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Sqm Max</Form.Label>
                        <Form.Control type="number" name="sqmMax" value={prefs.sqmMax} onChange={onChange(setPrefs)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Bedrooms</Form.Label>
                        <Form.Control type="number" name="bedrooms" value={prefs.bedrooms} onChange={onChange(setPrefs)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Bathrooms</Form.Label>
                        <Form.Control type="number" name="bathrooms" value={prefs.bathrooms} onChange={onChange(setPrefs)} />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Tri-state picks */}
                  <Row className="g-3 mt-0">
                    <Col md={3}>
                      <TriStateSelect
                        label="Furnished"
                        name="furnished"
                        value={prefs.furnished}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                    <Col md={3}>
                      <TriStateSelect
                        label="Pets allowed"
                        name="petsAllowed"
                        value={prefs.petsAllowed}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                    <Col md={3}>
                      <TriStateSelect
                        label="Smoking allowed"
                        name="smokingAllowed"
                        value={prefs.smokingAllowed}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Heating Type (optional)</Form.Label>
                        <Form.Select name="heatingType" value={prefs.heatingType} onChange={onChange(setPrefs)}>
                          <option value="">Select</option>
                          <option value="autonomous">Autonomous</option>
                          <option value="central">Central</option>
                          <option value="ac">AC</option>
                          <option value="none">None</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* Year Built Min */}
                  <Row className="g-3 mt-0">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Year Built Min</Form.Label>
                        <Form.Control
                          type="number"
                          name="yearBuiltMin"
                          value={prefs.yearBuiltMin}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              ) : (
                // OWNER ONLY
                <>
                  <h5>Requirements</h5>
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Income Min (€)</Form.Label>
                        <Form.Control type="number" name="incomeMin" value={reqs.incomeMin} onChange={onChange(setReqs)} />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Income Max (€)</Form.Label>
                        <Form.Control type="number" name="incomeMax" value={reqs.incomeMax} onChange={onChange(setReqs)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Allowed Occupations (comma separated)</Form.Label>
                        <Form.Control name="allowedOccupations" value={reqs.allowedOccupations} onChange={onChange(setReqs)} />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Family Status</Form.Label>
                        <Form.Select name="familyStatus" value={reqs.familyStatus} onChange={onChange(setReqs)}>
                          <option value="">Select</option>
                          <option value="single">Single</option>
                          <option value="couple">Couple</option>
                          <option value="family">Family</option>
                          <option value="any">Any</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <Form.Check label="Pets allowed" name="petsAllowed" checked={reqs.petsAllowed} onChange={onChange(setReqs)} />
                    </Col>
                    <Col md={4} className="d-flex align-items-end">
                      <Form.Check label="Smoking allowed" name="smokingAllowed" checked={reqs.smokingAllowed} onChange={onChange(setReqs)} />
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Work Location</Form.Label>
                        <Form.Control name="workLocation" value={reqs.workLocation} onChange={onChange(setReqs)} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Preferred Tenant Region</Form.Label>
                        <Form.Control name="preferredTenantRegion" value={reqs.preferredTenantRegion} onChange={onChange(setReqs)} />
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              )}

              <div className="mt-4 d-flex justify-content-end">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
