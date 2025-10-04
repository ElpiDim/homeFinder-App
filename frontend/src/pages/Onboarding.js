import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import ProfileStep from '../components/ProfileStep';
import RequirementsStep from '../components/RequirementsStep';
import Logo from '../components/Logo';
import './Onboarding.css';

// Helper to remove empty/null/undefined values from an object
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

// Helper to ensure min <= max for range inputs
const ensureRange = (min, max) => {
  const n = (x) =>
    x === '' || x === undefined || x === null ? undefined : Number(x);
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
  const [step, setStep] = useState(1);

  const isClient = user?.role === 'client';

  useEffect(() => {
    if (!isClient) navigate('/dashboard', { replace: true });
  }, [isClient, navigate]);

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
      dealType: user?.preferences?.dealType || 'rent',
      location: user?.preferences?.location || '',
      rentMin: user?.preferences?.rentMin ?? '',
      rentMax: user?.preferences?.rentMax ?? '',
      priceMin: user?.preferences?.priceMin ?? '',
      priceMax: user?.preferences?.priceMax ?? '',
      sqmMin: user?.preferences?.sqmMin ?? '',
      sqmMax: user?.preferences?.sqmMax ?? '',
      bedrooms: user?.preferences?.bedrooms ?? '',
      bathrooms: user?.preferences?.bathrooms ?? '',
      parking: user?.preferences?.parking ?? null,
      petsAllowed: user?.preferences?.petsAllowed ?? null,
      smokingAllowed: user?.preferences?.smokingAllowed ?? null,
      furnished: user?.preferences?.furnished ?? null,
      heating: user?.preferences?.heating || '',
      leaseDuration: user?.preferences?.leaseDuration || '', // short-term / long-term
      floor: user?.preferences?.floor ?? '',
      elevator: user?.preferences?.elevator ?? null,
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
      setter((s) => ({ ...s, [name]: value }));
    } else if (type === 'checkbox') {
      setter((s) => ({ ...s, [name]: checked }));
    } else {
      setter((s) => ({ ...s, [name]: value }));
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (!personal.name.trim()) e.name = 'Name is required.';
    if (!personal.phone.trim()) e.phone = 'Phone is required.';
    if (
      personal.age &&
      (Number(personal.age) < 18 || Number(personal.age) > 120)
    ) {
      e.age = 'Please enter a valid age.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    const num = (v) =>
      v === '' || v === undefined ? undefined : Number(v);

    if (!prefs.location.trim()) e.location = 'Location is required.';

    const { rentMin, rentMax, priceMin, priceMax, sqmMin, sqmMax } = prefs;
    if (num(rentMin) > num(rentMax))
      e.rentMin = 'Min rent cannot be greater than max.';
    if (num(priceMin) > num(priceMax))
      e.priceMin = 'Min price cannot be greater than max.';
    if (num(sqmMin) > num(sqmMax))
      e.sqmMin = 'Min SqM cannot be greater than max.';

    if (prefs.dealType === 'rent') {
      if (num(rentMin) == null && num(rentMax) == null) {
        e.rentMin = 'Provide a rent range (at least one of Min/Max).';
      }
      if (!prefs.leaseDuration) {
        e.leaseDuration = 'Please select lease duration.';
      }
    } else {
      if (num(priceMin) == null && num(priceMax) == null) {
        e.priceMin = 'Provide a price range (at least one of Min/Max).';
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => setStep(step - 1);

  const submit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    setSaving(true);
    try {
      const intent = prefs.dealType === 'sale' ? 'buy' : 'rent';
      const rent = ensureRange(prefs.rentMin, prefs.rentMax);
      const price = ensureRange(prefs.priceMin, prefs.priceMax);
      const sqm = ensureRange(prefs.sqmMin, prefs.sqmMax);

      const personalClean = clean({
        name: personal.name,
        phone: personal.phone,
        age: personal.age ? Number(personal.age) : undefined,
        householdSize: personal.householdSize
          ? Number(personal.householdSize)
          : undefined,
        hasFamily: personal.hasFamily,
        hasPets: personal.hasPets,
        smoker: personal.smoker,
        occupation: personal.occupation,
        salary: personal.salary ? Number(personal.salary) : undefined,
        isWillingToHaveRoommate: personal.isWillingToHaveRoommate,
      });

      const prefsClean = clean({
        intent,
        location: prefs.location,
        ...(intent === 'rent'
          ? { rentMin: rent.min, rentMax: rent.max }
          : { priceMin: price.min, priceMax: price.max }),
        sqmMin: sqm.min,
        sqmMax: sqm.max,
        bedrooms: prefs.bedrooms ? Number(prefs.bedrooms) : undefined,
        bathrooms: prefs.bathrooms ? Number(prefs.bathrooms) : undefined,
        parking: prefs.parking,
        furnished: prefs.furnished,
        petsAllowed: prefs.petsAllowed,
        smokingAllowed: prefs.smokingAllowed,
        heating: prefs.heating || undefined,
        leaseDuration: prefs.leaseDuration || undefined,
        floor: prefs.floor ? Number(prefs.floor) : undefined,
        elevator: prefs.elevator,
      });

      const payload = { ...personalClean, preferences: prefsClean };
      const { data } = await api.post('/users/onboarding', payload);
      const updated = data.user || data;

      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      alert(`Onboarding failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isClient) return null;

  const progress = step === 1 ? 50 : 100;

  return (
    <div className="onboarding-container">
      <Card className="onboarding-card">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <Logo />
            <h3 className="mt-3 mb-0">Welcome!</h3>
            <p className="text-muted">Let's set up your profile.</p>
          </div>

          <div className="progress-bar-container">
            <div
              className="progress-bar-filler"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Form onSubmit={submit} noValidate>
            {step === 1 && (
              <ProfileStep
                personal={personal}
                onChange={onChange(setPersonal)}
                errors={errors}
              />
            )}

            {step === 2 && (
              <RequirementsStep
                prefs={prefs}
                onChange={onChange(setPrefs)}
                errors={errors}
              />
            )}

            <div className="d-flex justify-content-between mt-5">
              {step > 1 && (
                <Button
                  variant="link"
                  className="btn-onboarding-back"
                  onClick={prevStep}
                >
                  Back
                </Button>
              )}

              {step === 1 && (
                <Button
                  className="btn-onboarding-next ms-auto"
                  onClick={nextStep}
                >
                  Next: Preferences
                </Button>
              )}

              {step === 2 && (
                <Button
                  type="submit"
                  className="btn-onboarding-next ms-auto"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save & Finish'}
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
