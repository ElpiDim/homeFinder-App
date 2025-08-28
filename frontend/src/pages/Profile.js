 // src/pages/Profile.jsx
import React, { useMemo } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '../context/AuthContext';
import { Card, Row, Col, Button, Form } from 'react-bootstrap';
 
 function Profile() {
   const { user } = useAuth();
   const navigate = useNavigate();
 
  const pageGradient = useMemo(
    () => ({
      minHeight: '100vh',
      background:
        'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\\\n       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
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
 
   const profilePicture = user.profilePicture || '/default-avatar.jpg';
 
   const joinedDate = user.createdAt
     ? new Date(user.createdAt).toLocaleDateString('en-US', {
         year: 'numeric',
         month: 'long',
       })
     : 'Unknown';
  const bool = (v) => (v ? 'Yes' : 'No');
 

  return (
    <div style={pageGradient} className="py-4">
      <div className="container">
        <Card className="mb-4">
          <Card.Body className="d-flex align-items-center">
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
              <Card.Title className="mb-0">{user.name}</Card.Title>
              <Card.Subtitle className="text-muted">Joined in {joinedDate}</Card.Subtitle>
             </div>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header as="h5">Personal Information</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control plaintext readOnly value={user.name} />
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
              <Col md={6}>
              <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control plaintext readOnly value={user.address || ''} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control plaintext readOnly value={user.age ?? ''} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Household Size</Form.Label>
                  <Form.Control plaintext readOnly value={user.householdSize ?? ''} />
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
                  <Form.Control
                    plaintext
                    readOnly
                    value={bool(user.isWillingToHaveRoommate)}
                  />
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
                  <Form.Control plaintext readOnly value={user.salary || ''} />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
 

       <Card className="mb-4">
          <Card.Header as="h5">Preferences</Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Type</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.type || ''} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Location</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.location || ''} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Price</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.minPrice ?? ''} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Price</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.maxPrice ?? ''} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Min Sqm</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.minSqm ?? ''} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Sqm</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.maxSqm ?? ''} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Bedrooms</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.bedrooms ?? ''} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">                  <Form.Label>Bathrooms</Form.Label>
                  <Form.Control plaintext readOnly value={user.preferences?.bathrooms ?? ''} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Pets Allowed</Form.Label>
                  <Form.Control plaintext readOnly value={bool(user.preferences?.petsAllowed)} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Smoking Allowed</Form.Label>
                  <Form.Control plaintext readOnly value={bool(user.preferences?.smokingAllowed)} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">                  <Form.Label>Furnished</Form.Label>
                  <Form.Control plaintext readOnly value={bool(user.preferences?.furnished)} />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="text-end">
          <Button variant="primary" onClick={() => navigate('/edit-profile')}>
            Edit Profile
          </Button>
         </div>
       </div>
     </div>
   );
 }
 
 export default Profile;
