// src/pages/Onboarding.jsx
import React, { useState } from 'react';
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

  const [clientProfile, setClientProfile] = useState(user?.clientProfile || {
    occupation: '', income: '', familyStatus: 'single', pets: false, smoker: false
  });
  const [propertyPreferences, setPropertyPreferences] = useState(user?.propertyPreferences || {
    location: '', rent: '', sqm: '', bedrooms: '', furnished: false, parking: false
  });
  const [tenantRequirements, setTenantRequirements] = useState(user?.tenantRequirements || {
    occupation: '', income: '', familyStatus: 'single', pets: false, smoker: false
  });

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
        payload = {
          clientProfile: clean(clientProfile),
          propertyPreferences: clean(propertyPreferences),
        };
      } else { // Owner
        payload = {
          tenantRequirements: clean(tenantRequirements)
        };
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
            {isClient ? (
              <>
                {/* Client Profile */}
                <h5 className="mt-2">Your Profile</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Occupation</Form.Label>
                      <Form.Control name="occupation" value={clientProfile.occupation} onChange={onChange(setClientProfile)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Income (€/month)</Form.Label>
                      <Form.Control type="number" name="income" value={clientProfile.income} onChange={onChange(setClientProfile)} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-3 mt-2">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Family Status</Form.Label>
                      <Form.Select name="familyStatus" value={clientProfile.familyStatus} onChange={onChange(setClientProfile)}>
                        <option value="single">Single</option>
                        <option value="couple">Couple</option>
                        <option value="family">Family</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check label="Have pets" name="pets" checked={clientProfile.pets} onChange={onChange(setClientProfile)} />
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check label="Smoker" name="smoker" checked={clientProfile.smoker} onChange={onChange(setClientProfile)} />
                  </Col>
                </Row>

                {/* Property Preferences */}
                <h5 className="mt-4">Your Property Preferences</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Location</Form.Label>
                      <Form.Control name="location" value={propertyPreferences.location} onChange={onChange(setPropertyPreferences)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Max Rent (€/month)</Form.Label>
                      <Form.Control type="number" name="rent" value={propertyPreferences.rent} onChange={onChange(setPropertyPreferences)} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-3 mt-2">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Min Square Meters (sqm)</Form.Label>
                      <Form.Control type="number" name="sqm" value={propertyPreferences.sqm} onChange={onChange(setPropertyPreferences)} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Min Bedrooms</Form.Label>
                      <Form.Control type="number" name="bedrooms" value={propertyPreferences.bedrooms} onChange={onChange(setPropertyPreferences)} />
                    </Form.Group>
                  </Col>
                   <Col md={4} className="d-flex align-items-end">
                    <Form.Check label="Furnished" name="furnished" checked={propertyPreferences.furnished} onChange={onChange(setPropertyPreferences)} />
                  </Col>
                </Row>
              </>
            ) : (
              // OWNER: Requirements only
              <>
                <h5 className="mt-2">Tenant Requirements</h5>
                 <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Minimum Occupation</Form.Label>
                      <Form.Control name="occupation" value={tenantRequirements.occupation} onChange={onChange(setTenantRequirements)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Minimum Income (€/month)</Form.Label>
                      <Form.Control type="number" name="income" value={tenantRequirements.income} onChange={onChange(setTenantRequirements)} />
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-3 mt-2">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Family Status</Form.Label>
                      <Form.Select name="familyStatus" value={tenantRequirements.familyStatus} onChange={onChange(setTenantRequirements)}>
                        <option value="any">Any</option>
                        <option value="single">Single</option>
                        <option value="couple">Couple</option>
                        <option value="family">Family</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check label="Pets Allowed" name="pets" checked={tenantRequirements.pets} onChange={onChange(setTenantRequirements)} />
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check label="Smokers Allowed" name="smoker" checked={tenantRequirements.smoker} onChange={onChange(setTenantRequirements)} />
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
