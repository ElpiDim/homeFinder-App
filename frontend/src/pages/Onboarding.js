import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import RequirementsForm from '../components/RequirementsForm';
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

const ensureRange = (min, max) => {
  const n = (x) => (x === '' || x === undefined || x === null ? undefined : Number(x));
  const vmin = n(min);
  const vmax = n(max);
  if (vmin !== undefined && vmax !== undefined && vmin > vmax) {
    return { min: vmax, max: vmin }; // swap if entered reversed
  }
  return { min: vmin, max: vmax };
};

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
      // normalize dealType/intent
      dealType: user?.preferences?.dealType || (user?.preferences?.intent === 'buy' ? 'sale' : 'rent'),
      // location (string for now; can evolve to array later)
      location: user?.preferences?.location || '',
      // budgets
      rentMin: user?.preferences?.rentMin ?? '',
      rentMax: user?.preferences?.rentMax ?? '',
      priceMin: user?.preferences?.priceMin ?? '',
      priceMax: user?.preferences?.priceMax ?? '',
      // size & rooms
      sqmMin: user?.preferences?.sqmMin ?? '',
      sqmMax: user?.preferences?.sqmMax ?? '',
      bedrooms: user?.preferences?.bedrooms ?? '',
      bathrooms: user?.preferences?.bathrooms ?? '',
      // tri-state preferences
      parking: user?.preferences?.parking ?? null,
      petsAllowed: user?.preferences?.petsAllowed ?? null,
      smokingAllowed: user?.preferences?.smokingAllowed ?? null,
      furnished: user?.preferences?.furnished ?? null,
      // other
      heating: user?.preferences?.heating || '',
    }),
    [user]
  );

  const [personal, setPersonal] = useState(initPersonal);
  const [prefs, setPrefs] = useState(initPrefs);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'custom') {
      // from TriStateSelect
      setter((s) => ({ ...s, [name]: value }));
    } else if (type === 'checkbox') {
      setter((s) => ({ ...s, [name]: checked }));
    } else {
      setter((s) => ({ ...s, [name]: value }));
    }
  };

  const validate = () => {
    const e = {};
    const pairs = [
      ['rentMin', 'rentMax'],
      ['priceMin', 'priceMax'],
      ['sqmMin', 'sqmMax'],
    ];
    const num = (v) => (v === '' || v === undefined ? undefined : Number(v));

    pairs.forEach(([mi, ma]) => {
      const vmin = num(prefs[mi]);
      const vmax = num(prefs[ma]);
      if (vmin != null && vmax != null && vmin > vmax) {
        e[mi] = 'Min should be ≤ Max';
      }
    });

    // Require at least one bound for the active budget type
    if (prefs.dealType === 'rent') {
      if (num(prefs.rentMin) == null && num(prefs.rentMax) == null) {
        e.rentMin = 'Provide a rent range (at least one of Min/Max).';
      }
    } else {
      if (num(prefs.priceMin) == null && num(prefs.priceMax) == null) {
        e.priceMin = 'Provide a purchase price range (at least one of Min/Max).';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // normalize intent from dealType
      const intent = prefs.dealType === 'sale' ? 'buy' : 'rent';

      // normalize ranges
      const rent = ensureRange(prefs.rentMin, prefs.rentMax);
      const price = ensureRange(prefs.priceMin, prefs.priceMax);
      const sqm = ensureRange(prefs.sqmMin, prefs.sqmMax);

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
        dealType: prefs.dealType, // keep for FE compatibility if you use it elsewhere
        intent,                   // primary for backend matching: 'rent' | 'buy'
        location: prefs.location, // later: locations: [...]
        ...(intent === 'rent'
          ? { rentMin: rent.min, rentMax: rent.max }
          : { priceMin: price.min, priceMax: price.max }),
        sqmMin: sqm.min,
        sqmMax: sqm.max,
        bedrooms: prefs.bedrooms ? Number(prefs.bedrooms) : undefined,
        bathrooms: prefs.bathrooms ? Number(prefs.bathrooms) : undefined,
        // tri-state: leave undefined if no preference so backend won’t filter
        parking: prefs.parking === null ? undefined : !!prefs.parking,
        furnished: prefs.furnished === null ? undefined : !!prefs.furnished,
        petsAllowed: prefs.petsAllowed === null ? undefined : !!prefs.petsAllowed,
        smokingAllowed: prefs.smokingAllowed === null ? undefined : !!prefs.smokingAllowed,
        heating: prefs.heating || undefined,
      });

      const payload = { ...personalClean, preferences: prefsClean };

      const { data } = await api.post('/users/onboarding', payload);
      const updated = data.user || data;

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

  const isRent = prefs.dealType !== 'sale';

  return (
    <div className="container py-4" style={{ maxWidth: 920 }}>
      <Card>
        <Card.Body>
          <Card.Title className="mb-3">
            Welcome! Tell us about you & what you’re looking for
          </Card.Title>

          <Form onSubmit={submit}>
            {/* Personal */}
            <h5 className="mt-2">Personal Information</h5>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    name="name"
                    value={personal.name}
                    onChange={onChange(setPersonal)}
                  />
                </Form.Group>
              </Col>
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
            </Row>

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
                  <Form.Control
                    name="location"
                    value={prefs.location}
                    onChange={onChange(setPrefs)}
                    placeholder="e.g., Athens, Center"
                  />
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
                      <Form.Control.Feedback type="invalid">
                        {errors.rentMin}
                      </Form.Control.Feedback>
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
                      <Form.Control.Feedback type="invalid">
                        {errors.priceMin}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label>Purchase Max (€)</Form.Label>
                      <Form.Control
                        type="number"
                        name="priceMax"
                        value={prefs.priceMax}
                        onChange={onChange(setPrefs)}
                      />
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
                  <Form.Control.Feedback type="invalid">
                    {errors.sqmMin}
                  </Form.Control.Feedback>
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
                    min={0}
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
                    min={0}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Tri-state preferences */}
            <Row className="g-3 mt-0">
              <Col md={3}>
                <TriStateSelect
                  label="Parking"
                  name="parking"
                  value={prefs.parking}
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
                <TriStateSelect
                  label="Furnished"
                  name="furnished"
                  value={prefs.furnished}
                  onChange={onChange(setPrefs)}
                />
              </Col>
            </Row>

            <Row className="g-3 mt-0">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Heating (optional)</Form.Label>
                  <Form.Control
                    name="heating"
                    value={prefs.heating}
                    onChange={onChange(setPrefs)}
                    placeholder="e.g., natural gas, heat pump"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Keep your RequirementsForm if it renders extra fields */}
            <RequirementsForm values={prefs} setValues={setPrefs} />

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
