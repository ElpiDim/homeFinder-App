// src/pages/Onboarding.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const clean = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '' && !(typeof v === 'number' && isNaN(v))
    )
  );

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const isClient = user?.role === 'client';

  // --- initial values from existing user data (if any) ---
  const initPersonal = useMemo(
    () => ({
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
    }),
    [user]
  );

  const initPrefs = useMemo(
    () => ({
      location: user?.preferences?.location || '',
      rentMin: user?.preferences?.rentMin ?? '',
      rentMax: user?.preferences?.rentMax ?? '',
      sqmMin: user?.preferences?.sqmMin ?? '',
      sqmMax: user?.preferences?.sqmMax ?? '',
      bedrooms: user?.preferences?.bedrooms ?? '',
      bathrooms: user?.preferences?.bathrooms ?? '',
      furnished: !!user?.preferences?.furnished,
      petsAllowed: !!user?.preferences?.petsAllowed,
      smokingAllowed: !!user?.preferences?.smokingAllowed,
      yearBuiltMin: user?.preferences?.yearBuiltMin ?? '',
      heatingType: user?.preferences?.heatingType || '',
    }),
    [user]
  );

  const initReqs = useMemo(
    () => ({
      incomeMin: user?.requirements?.incomeMin ?? '',
      incomeMax: user?.requirements?.incomeMax ?? '',
      allowedOccupations: (user?.requirements?.allowedOccupations || []).join(', '),
      familyStatus: user?.requirements?.familyStatus || '',
      petsAllowed: !!user?.requirements?.petsAllowed,
      smokingAllowed: !!user?.requirements?.smokingAllowed,
      workLocation: user?.requirements?.workLocation || '',
      preferredTenantRegion: user?.requirements?.preferredTenantRegion || '',
    }),
    [user]
  );

  const [personal, setPersonal] = useState(initPersonal);
  const [prefs, setPrefs] = useState(initPrefs);
  const [reqs, setReqs] = useState(initReqs);
  const [saving, setSaving] = useState(false);

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let payload;

      if (isClient) {
        // Personal + Preferences
        const personalClean = clean({
          name: personal.name,
          phone: personal.phone,
          age: personal.age ? Number(personal.age) : undefined,
          householdSize: personal.householdSize ? Number(personal.householdSize) : undefined,
          hasFamily: personal.hasFamily,
          hasPets: personal.hasPets,
          smoker: personal.smoker,
          occupation: personal.occupation,
          salary: personal.salary ? Number(personal.salary) : undefined,
          isWillingToHaveRoommate: personal.isWillingToHaveRoommate,
        });

        const prefsClean = clean({
          location: prefs.location,
          rentMin: prefs.rentMin ? Number(prefs.rentMin) : undefined,
          rentMax: prefs.rentMax ? Number(prefs.rentMax) : undefined,
          sqmMin: prefs.sqmMin ? Number(prefs.sqmMin) : undefined,
          sqmMax: prefs.sqmMax ? Number(prefs.sqmMax) : undefined,
          bedrooms: prefs.bedrooms ? Number(prefs.bedrooms) : undefined,
          bathrooms: prefs.bathrooms ? Number(prefs.bathrooms) : undefined,
          furnished: !!prefs.furnished,
          petsAllowed: !!prefs.petsAllowed,
          smokingAllowed: !!prefs.smokingAllowed,
          yearBuiltMin: prefs.yearBuiltMin ? Number(prefs.yearBuiltMin) : undefined,
          heatingType: prefs.heatingType || undefined, // enum: autonomous|central|ac|none
        });

        payload = { ...personalClean, preferences: prefsClean };
      } else {
        // Only Requirements (owner)
        const reqsClean = clean({
          incomeMin: reqs.incomeMin ? Number(reqs.incomeMin) : undefined,
          incomeMax: reqs.incomeMax ? Number(reqs.incomeMax) : undefined,
          allowedOccupations: reqs.allowedOccupations
            ? reqs.allowedOccupations.split(',').map((o) => o.trim()).filter(Boolean)
            : [],
          familyStatus: reqs.familyStatus || undefined,
          petsAllowed: !!reqs.petsAllowed,
          smokingAllowed: !!reqs.smokingAllowed,
          workLocation: reqs.workLocation || undefined,
          preferredTenantRegion: reqs.preferredTenantRegion || undefined,
        });

        payload = { requirements: reqsClean };
      }

      const { data } = await api.post('/users/onboarding', payload);
      const updated = data.user || data;

      // update auth state
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err.message;
      console.error('onboarding failed', status, msg, err?.response?.data);
      alert(`Onboarding failed: ${status || '?'} - ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 920 }}>
      <Card>
        <Card.Body>
          <Card.Title className="mb-3">
            {isClient ? 'Welcome! Tell us about you & what you’re looking for' : 'Welcome! Set your tenant requirements'}
          </Card.Title>

          <Form onSubmit={submit}>
            {/* CLIENT: Personal + Preferences */}
            {isClient ? (
              <>
                {/* Personal */}
                <h5 className="mt-2">Personal Information</h5>
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
                <h5 className="mt-4">Preferences (What you’re looking for)</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Location</Form.Label>
                      <Form.Control name="location" value={prefs.location} onChange={onChange(setPrefs)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Rent Min (€)</Form.Label>
                      <Form.Control type="number" name="rentMin" value={prefs.rentMin} onChange={onChange(setPrefs)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Rent Max (€)</Form.Label>
                      <Form.Control type="number" name="rentMax" value={prefs.rentMax} onChange={onChange(setPrefs)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mt-0">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Sqm Min</Form.Label>
                      <Form.Control type="number" name="sqmMin" value={prefs.sqmMin} onChange={onChange(setPrefs)} />
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

                <Row className="g-3 mt-0">
                  <Col md={3} className="d-flex align-items-end">
                    <Form.Check label="Furnished" name="furnished" checked={prefs.furnished} onChange={onChange(setPrefs)} />
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Form.Check label="Pets allowed" name="petsAllowed" checked={prefs.petsAllowed} onChange={onChange(setPrefs)} />
                  </Col>
                  <Col md={3} className="d-flex align-items-end">
                    <Form.Check label="Smoking allowed" name="smokingAllowed" checked={prefs.smokingAllowed} onChange={onChange(setPrefs)} />
                  </Col>
                </Row>

                <Row className="g-3 mt-0">
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Year Built Min</Form.Label>
                      <Form.Control type="number" name="yearBuiltMin" value={prefs.yearBuiltMin} onChange={onChange(setPrefs)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Heating Type</Form.Label>
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
              </>
            ) : (
              // OWNER: Requirements only
              <>
                <h5 className="mt-2">Requirements</h5>
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
                {saving ? 'Saving...' : 'Save & Continue'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
