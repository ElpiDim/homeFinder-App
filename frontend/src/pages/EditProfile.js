// src/pages/EditProfile.jsx
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';

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

export default function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const isClient = user?.role === 'client';

  // --- initial state from user (safe fallbacks) ---
  const [personal, setPersonal] = useState({
    // shared
    name: user?.name || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    // client-only extras
    age: user?.age ?? '',
    householdSize: user?.householdSize ?? '',
    hasFamily: !!user?.hasFamily,
    hasPets: !!user?.hasPets,
    smoker: !!user?.smoker,
    occupation: user?.occupation || '',
    salary: user?.salary ?? '',
    isWillingToHaveRoommate: !!user?.isWillingToHaveRoommate,
  });

  // Clients only
  const [prefs, setPrefs] = useState({
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
  });

  const [saving, setSaving] = useState(false);

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const toNumOrUndef = (v) =>
    v === '' || v === null || v === undefined ? undefined : Number(v);

  const validateClient = () => {
    const rMin = toNumOrUndef(prefs.rentMin);
    const rMax = toNumOrUndef(prefs.rentMax);
    if (rMin !== undefined && rMax !== undefined && rMin > rMax) {
      alert('Rent Min cannot be greater than Rent Max.');
      return false;
    }
    const sMin = toNumOrUndef(prefs.sqmMin);
    const sMax = toNumOrUndef(prefs.sqmMax);
    if (sMin !== undefined && sMax !== undefined && sMin > sMax) {
      alert('Sqm Min cannot be greater than Sqm Max.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('You need to be logged in.');
      return;
    }

    if (isClient && !validateClient()) return;

    setSaving(true);
    try {
      let payload;

      if (isClient) {
        // client: full personal + preferences
        const personalClean = clean({
          name: personal.name,
          lastName: personal.lastName,
          phone: personal.phone,
          address: personal.address,
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
          location: prefs.location,
          rentMin: toNumOrUndef(prefs.rentMin),
          rentMax: toNumOrUndef(prefs.rentMax),
          sqmMin: toNumOrUndef(prefs.sqmMin),
          sqmMax: toNumOrUndef(prefs.sqmMax),
          bedrooms: toNumOrUndef(prefs.bedrooms),
          bathrooms: toNumOrUndef(prefs.bathrooms),
          furnished: !!prefs.furnished,
          petsAllowed: !!prefs.petsAllowed,
          smokingAllowed: !!prefs.smokingAllowed,
          yearBuiltMin: toNumOrUndef(prefs.yearBuiltMin),
          heatingType: prefs.heatingType || undefined,
        });

        payload = clean({ ...personalClean, preferences: prefsClean });
      } else {
        // owner: ONLY first/last name, phone, address
        payload = clean({
          name: personal.name,
          lastName: personal.lastName,
          phone: personal.phone,
          address: personal.address,
        });
      }

      const { data } = await api.patch('/users/me', payload);

      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
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

  return (
    <div style={pageGradient} className="py-4">
      <div className="container" style={{ maxWidth: 960 }}>
        <Card>
          <Card.Body>
            {/* Top bar with Back button + Title */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <Button
                variant="outline-secondary"
                className="rounded-pill px-3"
                onClick={() => navigate('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
              <Card.Title className="mb-0">Edit Profile</Card.Title>
              <div style={{ width: 158 }} />
            </div>

            <Form onSubmit={handleSubmit}>
              {/* Personal (shown for both roles) */}
              <h5>Personal Information</h5>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>First Name</Form.Label>
                    <Form.Control
                      name="name"
                      value={personal.name}
                      onChange={onChange(setPersonal)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Last Name</Form.Label>
                    <Form.Control
                      name="lastName"
                      value={personal.lastName}
                      onChange={onChange(setPersonal)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row className="g-3 mt-0">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      name="phone"
                      value={personal.phone}
                      onChange={onChange(setPersonal)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      name="address"
                      value={personal.address}
                      onChange={onChange(setPersonal)}
                      placeholder="Street, number, area"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Client-only extra personal fields */}
              {isClient && (
                <>
                  <Row className="g-3 mt-0">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Age</Form.Label>
                        <Form.Control
                          type="number"
                          name="age"
                          value={personal.age}
                          onChange={onChange(setPersonal)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Household Size</Form.Label>
                        <Form.Control
                          type="number"
                          name="householdSize"
                          value={personal.householdSize}
                          onChange={onChange(setPersonal)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Has family"
                        name="hasFamily"
                        checked={personal.hasFamily}
                        onChange={onChange(setPersonal)}
                      />
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Has pets"
                        name="hasPets"
                        checked={personal.hasPets}
                        onChange={onChange(setPersonal)}
                      />
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Smoker"
                        name="smoker"
                        checked={personal.smoker}
                        onChange={onChange(setPersonal)}
                      />
                    </Col>
                    <Col md={5}>
                      <Form.Group>
                        <Form.Label>Occupation</Form.Label>
                        <Form.Control
                          name="occupation"
                          value={personal.occupation}
                          onChange={onChange(setPersonal)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>Salary (€)</Form.Label>
                        <Form.Control
                          type="number"
                          name="salary"
                          value={personal.salary}
                          onChange={onChange(setPersonal)}
                        />
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
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label>Location</Form.Label>
                        <Form.Control
                          name="location"
                          value={prefs.location}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Rent Min (€)</Form.Label>
                        <Form.Control
                          type="number"
                          name="rentMin"
                          value={prefs.rentMin}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Rent Max (€)</Form.Label>
                        <Form.Control
                          type="number"
                          name="rentMax"
                          value={prefs.rentMax}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
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
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Sqm Max</Form.Label>
                        <Form.Control
                          type="number"
                          name="sqmMax"
                          value={prefs.sqmMax}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Bedrooms</Form.Label>
                        <Form.Control
                          type="number"
                          name="bedrooms"
                          value={prefs.bedrooms}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Bathrooms</Form.Label>
                        <Form.Control
                          type="number"
                          name="bathrooms"
                          value={prefs.bathrooms}
                          onChange={onChange(setPrefs)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row className="g-3 mt-0">
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Furnished"
                        name="furnished"
                        checked={prefs.furnished}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Pets allowed"
                        name="petsAllowed"
                        checked={prefs.petsAllowed}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                      <Form.Check
                        label="Smoking allowed"
                        name="smokingAllowed"
                        checked={prefs.smokingAllowed}
                        onChange={onChange(setPrefs)}
                      />
                    </Col>
                  </Row>

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
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>Heating Type</Form.Label>
                        <Form.Select
                          name="heatingType"
                          value={prefs.heatingType}
                          onChange={onChange(setPrefs)}
                        >
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
