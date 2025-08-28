import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCurrentUser, updateCurrentUser, updatePreferences } from '../services';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';

function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [personal, setPersonal] = useState({
    age: '',
    householdSize: 1,
    hasFamily: false,
    hasPets: false,
    smoker: false,
    occupation: '',
    salary: '',
    isWillingToHaveRoommate: false,
  });

  const [prefs, setPrefs] = useState({
    type: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    minSqm: '',
    maxSqm: '',
    bedrooms: '',
    bathrooms: '',
    petsAllowed: false,
    smokingAllowed: false,
    furnished: false,
  });

  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUser();
        setPersonal({
          age: data.age || '',
          householdSize: data.householdSize || 1,
          hasFamily: data.hasFamily || false,
          hasPets: data.hasPets || false,
          smoker: data.smoker || false,
          occupation: data.occupation || '',
          salary: data.salary || '',
          isWillingToHaveRoommate: data.isWillingToHaveRoommate || false,
        });
        const p = data.preferences || {};
        setPrefs({
          type: p.type || '',
          location: p.location || '',
          minPrice: p.minPrice || '',
          maxPrice: p.maxPrice || '',
          minSqm: p.minSqm || '',
          maxSqm: p.maxSqm || '',
          bedrooms: p.bedrooms || '',
          bathrooms: p.bathrooms || '',
          petsAllowed: p.petsAllowed || false,
          smokingAllowed: p.smokingAllowed || false,
          furnished: p.furnished || false,
        });
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, [setUser]);

  const handlePersonalChange = (e) => {
    const { name, type, value, checked } = e.target;
    setPersonal((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePrefsChange = (e) => {
    const { name, type, value, checked } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updated = await updateCurrentUser(personal);
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      const payload = { ...prefs };
      if (!updated.hasCompletedOnboarding) {
        payload.completeOnboarding = true;
      }
      const prefRes = await updatePreferences(payload);
      const newUser = prefRes.user || prefRes;
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

      setMessage('Profile updated successfully');
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mt-4">
      <h3>Edit Profile</h3>
      {message && <Alert variant="success">{message}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <Card.Header as="h5">Personal Information</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control type="number" name="age" value={personal.age} onChange={handlePersonalChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Household Size</Form.Label>
                  <Form.Control type="number" name="householdSize" value={personal.householdSize} onChange={handlePersonalChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" name="hasFamily" label="Has Family" checked={personal.hasFamily} onChange={handlePersonalChange} />
              <Form.Check type="checkbox" name="hasPets" label="Has Pets" checked={personal.hasPets} onChange={handlePersonalChange} />
              <Form.Check type="checkbox" name="smoker" label="Smoker" checked={personal.smoker} onChange={handlePersonalChange} />
              <Form.Check type="checkbox" name="isWillingToHaveRoommate" label="Willing to have roommate" checked={personal.isWillingToHaveRoommate} onChange={handlePersonalChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Occupation</Form.Label>
              <Form.Control type="text" name="occupation" value={personal.occupation} onChange={handlePersonalChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Salary</Form.Label>
              <Form.Control type="number" name="salary" value={personal.salary} onChange={handlePersonalChange} />
            </Form.Group>
          </Card.Body>
        </Card>

        <Card>
          <Card.Header as="h5">Preferences</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Control type="text" name="type" value={prefs.type} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control type="text" name="location" value={prefs.location} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Price</Form.Label>
                  <Form.Control type="number" name="minPrice" value={prefs.minPrice} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Price</Form.Label>
                  <Form.Control type="number" name="maxPrice" value={prefs.maxPrice} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Sqm</Form.Label>
                  <Form.Control type="number" name="minSqm" value={prefs.minSqm} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Sqm</Form.Label>
                  <Form.Control type="number" name="maxSqm" value={prefs.maxSqm} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bedrooms</Form.Label>
                  <Form.Control type="number" name="bedrooms" value={prefs.bedrooms} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bathrooms</Form.Label>
                  <Form.Control type="number" name="bathrooms" value={prefs.bathrooms} onChange={handlePrefsChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Check type="checkbox" name="petsAllowed" label="Pets Allowed" checked={prefs.petsAllowed} onChange={handlePrefsChange} />
              <Form.Check type="checkbox" name="smokingAllowed" label="Smoking Allowed" checked={prefs.smokingAllowed} onChange={handlePrefsChange} />
              <Form.Check type="checkbox" name="furnished" label="Furnished" checked={prefs.furnished} onChange={handlePrefsChange} />
            </Form.Group>
          </Card.Body>
        </Card>
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Save
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default EditProfile;