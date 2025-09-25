// src/pages/Profile.jsx
import React, { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Row, Col, Button, Form, Badge } from 'react-bootstrap';
import api from '../api';

function Profile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  // Fetch fresh user on mount to reflect any server-side changes after editing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        const fresh = data?.user || data;
        if (!cancelled && fresh) {
          setUser(fresh);
          localStorage.setItem('user', JSON.stringify(fresh));
        }
      } catch {
        // optional: keep silent; the view still renders from context
      }
    })();
    return () => { cancelled = true; };
  }, [setUser]);

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
      <div style={pageGradient}>
        <div className="container mt-5">Loading profile...</div>
      </div>
    );
  }

  const isClient = user.role === 'client';
  const profilePicture = user.profilePicture || '/default-avatar.jpg';
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown';

  // Tri-state display helpers
  const bool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '-');
  const orDash = (v) => (v === 0 || v ? v : '-');

  const p = user.preferences || {};
  const r = user.requirements || {};

  // Normalize intent from preferences (supports either `intent` or `dealType`)
  const intent = p?.intent || (p?.dealType === 'sale' ? 'buy' : 'rent');

  return (
    <div style={pageGradient} className="py-4">
      <div className="container">
        {/* Header */}
        <Card className="mb-4">
          <Card.Body className="d-flex align-items-center justify-content-between">
            {/* LEFT: Dashboard button + avatar + basic info */}
            <div className="d-flex align-items-center">
              <Button
                variant="outline-secondary"
                className="me-3"
                onClick={() => navigate('/dashboard')}
              >
                ← 
              </Button>

              <div
                className="rounded-circle bg-light me-3"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundImage: `url(${profilePicture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div>
                <Card.Title className="mb-0">
                  {user.name || user.email}
                  {isClient && (
                    <Badge
                      bg={user.onboardingCompleted ? 'success' : 'warning'}
                      className="ms-2"
                    >
                      {user.onboardingCompleted ? 'Onboarding complete' : 'Onboarding pending'}
                    </Badge>
                  )}
                </Card.Title>
                <Card.Subtitle className="text-muted">Joined in {joinedDate}</Card.Subtitle>
              </div>
            </div>

            {/* RIGHT: Edit button */}
            <div>
              <Button variant="primary" onClick={() => navigate('/edit-profile')}>
                Edit Profile
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* === CLIENT VIEW: Personal + Preferences === */}
        {isClient && (
          <>
            {/* Personal Information */}
            <Card className="mb-4">
              <Card.Header as="h5">Personal Information</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Name</Form.Label>
                      <Form.Control plaintext readOnly value={user.name || ''} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control plaintext readOnly value={user.email} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Phone</Form.Label>
                      <Form.Control plaintext readOnly value={user.phone || ''} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Age</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(user.age)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Household Size</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(user.householdSize)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Has Family</Form.Label>
                      <Form.Control plaintext readOnly value={bool(user.hasFamily)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Has Pets</Form.Label>
                      <Form.Control plaintext readOnly value={bool(user.hasPets)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Smoker</Form.Label>
                      <Form.Control plaintext readOnly value={bool(user.smoker)} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Willing to Have Roommate</Form.Label>
                      <Form.Control plaintext readOnly value={bool(user.isWillingToHaveRoommate)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Occupation</Form.Label>
                      <Form.Control plaintext readOnly value={user.occupation || ''} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Salary</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(user.salary)} />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Preferences */}
            <Card className="mb-4">
              <Card.Header as="h5">What I'm looking for (Preferences)</Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Location</Form.Label>
                      <Form.Control plaintext readOnly value={p.location || ''} />
                    </Form.Group>
                  </Col>

                  {/* Budget: rent or purchase based on intent */}
                  {intent === 'rent' ? (
                    <>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Rent Min (€)</Form.Label>
                          <Form.Control plaintext readOnly value={orDash(p.rentMin)} />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Rent Max (€)</Form.Label>
                          <Form.Control plaintext readOnly value={orDash(p.rentMax)} />
                        </Form.Group>
                      </Col>
                    </>
                  ) : (
                    <>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Purchase Min (€)</Form.Label>
                          <Form.Control plaintext readOnly value={orDash(p.priceMin)} />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Purchase Max (€)</Form.Label>
                          <Form.Control plaintext readOnly value={orDash(p.priceMax)} />
                        </Form.Group>
                      </Col>
                    </>
                  )}
                </Row>

                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sqm Min</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(p.sqmMin)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Sqm Max</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(p.sqmMax)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bedrooms</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(p.bedrooms)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bathrooms</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(p.bathrooms)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Furnished</Form.Label>
                      <Form.Control plaintext readOnly value={bool(p.furnished)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Pets Allowed</Form.Label>
                      <Form.Control plaintext readOnly value={bool(p.petsAllowed)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Smoking Allowed</Form.Label>
                      <Form.Control plaintext readOnly value={bool(p.smokingAllowed)} />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Year Built Min</Form.Label>
                      <Form.Control plaintext readOnly value={orDash(p.yearBuiltMin)} />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Heating Type</Form.Label>
                      <Form.Control plaintext readOnly value={p.heatingType || '-'} />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </>
        )}

        {/* === OWNER VIEW: ONLY Requirements === */}
        {!isClient && (
          <Card className="mb-4">
            <Card.Header as="h5">Requirements</Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Income Min (€)</Form.Label>
                    <Form.Control plaintext readOnly value={orDash(r.incomeMin)} />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Income Max (€)</Form.Label>
                    <Form.Control plaintext readOnly value={orDash(r.incomeMax)} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Allowed Occupations</Form.Label>
                    <Form.Control
                      plaintext
                      readOnly
                      value={(r.allowedOccupations || []).join(', ') || '-'}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Family Status</Form.Label>
                    <Form.Control plaintext readOnly value={r.familyStatus || '-'} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Pets Allowed</Form.Label>
                    <Form.Control plaintext readOnly value={bool(r.petsAllowed)} />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Smoking Allowed</Form.Label>
                    <Form.Control plaintext readOnly value={bool(r.smokingAllowed)} />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Work Location</Form.Label>
                    <Form.Control plaintext readOnly value={r.workLocation || '-'} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Preferred Tenant Region</Form.Label>
                    <Form.Control plaintext readOnly value={r.preferredTenantRegion || '-'} />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Profile;
