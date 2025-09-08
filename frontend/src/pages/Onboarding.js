// src/pages/Onboarding.jsx
import React, { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { tenantFields, propertyFields } from '../config/criteria';

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
    if (user?.role !== 'client') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const initValues = (fields, existing = {}) =>
    fields.reduce(
      (acc, f) => ({
        ...acc,
        [f.key]: existing[f.key] ?? (f.type === 'checkbox' ? false : ''),
      }),
      {}
    );

  const [clientProfile, setClientProfile] = useState(
    initValues(tenantFields, user?.clientProfile || {})
  );
  const [propertyPreferences, setPropertyPreferences] = useState(
    initValues(propertyFields, user?.propertyPreferences || {})
  );

  const [saving, setSaving] = useState(false);

  const onChange = (setter) => (e) => {
    const { name, value, type, checked } = e.target;
    setter((s) => ({ ...s, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
            const payload = {
        clientProfile: clean(clientProfile),
        propertyPreferences: clean(propertyPreferences),
      };

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
              {/* Client Profile */}
              <h5 className="mt-2">Your Profile</h5>
              <Row className="g-3">
                {tenantFields.map((f) => (
                  <Col
                    md={f.type === 'checkbox' ? 4 : 6}
                    className={f.type === 'checkbox' ? 'd-flex align-items-end' : ''}
                    key={f.key}
                  >
                    {f.type === 'checkbox' ? (
                      <Form.Check
                        label={f.label}
                        name={f.key}
                        checked={clientProfile[f.key]}
                        onChange={onChange(setClientProfile)}
                      />
                    ) : f.type === 'select' ? (
                      <Form.Group>
                        <Form.Label>{f.label}</Form.Label>
                        <Form.Select
                          name={f.key}
                          value={clientProfile[f.key]}
                          onChange={onChange(setClientProfile)}
                        >
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt || 'Any'}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    ) : (
                      <Form.Group>
                        <Form.Label>{f.label}</Form.Label>
                        <Form.Control
                          type={f.type}
                          name={f.key}
                          value={clientProfile[f.key]}
                          onChange={onChange(setClientProfile)}
                        />
                      </Form.Group>
                    )}
                  </Col>
                ))}
              </Row>

              {/* Property Preferences */}
              <h5 className="mt-4">Your Property Preferences</h5>
              <Row className="g-3">
                {propertyFields.map((f) => (
                  <Col
                    md={f.type === 'checkbox' ? 4 : 6}
                    className={f.type === 'checkbox' ? 'd-flex align-items-end' : ''}
                    key={f.key}
                  >
                    {f.type === 'checkbox' ? (
                      <Form.Check
                        label={f.label}
                        name={f.key}
                        checked={propertyPreferences[f.key]}
                        onChange={onChange(setPropertyPreferences)}
                      />
                    ) : f.type === 'select' ? (
                      <Form.Group>
                        <Form.Label>{f.label}</Form.Label>
                        <Form.Select
                          name={f.key}
                          value={propertyPreferences[f.key]}
                          onChange={onChange(setPropertyPreferences)}
                        >
                          {f.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt || 'Any'}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    ) : (
                      <Form.Group>
                        <Form.Label>{f.label}</Form.Label>
                        <Form.Control
                          type={f.type}
                          name={f.key}
                          value={propertyPreferences[f.key]}
                          onChange={onChange(setPropertyPreferences)}
                        />
                      </Form.Group>
                    )}
                  </Col>
                ))}
              </Row>
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
