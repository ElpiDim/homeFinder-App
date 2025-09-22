// src/pages/Onboarding.jsx
import React, { useMemo, useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import RequirementsForm from '../components/RequirementsForm';

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

 useEffect(() => {
    if (!isClient) navigate('/dashboard', { replace: true });
  }, [isClient, navigate]);

  if (!isClient) return null;
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
      parking: !!user?.preferences?.parking,
      petsAllowed: !!user?.preferences?.petsAllowed,
      smokingAllowed: !!user?.preferences?.smokingAllowed,
      furnished: !!user?.preferences?.furnished,
      heating: user?.preferences?.heating || '',
    }),
    [user]
  );

  const [personal, setPersonal] = useState(initPersonal);
  const [prefs, setPrefs] = useState(initPrefs);
  const [saving, setSaving] = useState(false);

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
        dealType:prefs.dealType === 'sale'? 'sale' : 'rent', 
        location: prefs.location,
        rentMin: prefs.rentMin ? Number(prefs.rentMin) : undefined,
        rentMax: prefs.rentMax ? Number(prefs.rentMax) : undefined,
        sqmMin: prefs.sqmMin ? Number(prefs.sqmMin) : undefined,
        sqmMax: prefs.sqmMax ? Number(prefs.sqmMax) : undefined,
        bedrooms: prefs.bedrooms ? Number(prefs.bedrooms) : undefined,
        bathrooms: prefs.bathrooms ? Number(prefs.bathrooms) : undefined,
        parking: !!prefs.parking,
        furnished: !!prefs.furnished,
        petsAllowed: !!prefs.petsAllowed,
        smokingAllowed: !!prefs.smokingAllowed,
        heating: prefs.heating ||undefined
      });

      const payload = { ...personalClean, preferences: prefsClean };
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
            Welcome! Tell us about you & what you’re looking for
          </Card.Title>

          <Form onSubmit={submit}>

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
                   <Col md={12}>
                    <Form.Group>
                      <Form.Label>I’m interested in</Form.Label>
                      <div className="d-flex gap-4">
                        <Form.Check
                          type="radio"
                          id="dealType-rent"
                          name="dealType"
                          value="rent"
                          label="Renting"
                          checked={prefs.dealType === 'rent'}
                          onChange={onChange(setPrefs)}
                        />
                        <Form.Check
                          type="radio"
                          id="dealType-sale"
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
                </Row>
                <RequirementsForm values={prefs} setValues={setPrefs} />
              </>

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
