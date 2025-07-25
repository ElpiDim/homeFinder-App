import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Button } from 'react-bootstrap';
import {useNavigate} from 'react-router-dom';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container className="mt-5">
      <Button 
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate('/dashboard')}>
          Back 
        </Button>
      <Card className="shadow-lg border-0">
        <Card.Header className="bg-primary text-white text-center">
          <h3>👤 User Profile</h3>
        </Card.Header>
        <Card.Body>
          <p><strong>Name:</strong> {user?.name}</p>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Type:</strong> {user?.role}</p>
          <p><strong>Phone Number:</strong> {user?.phone || '-'}</p>
          <p><strong>Address:</strong> {user?.address || '-'}</p>
          <p><strong>Occupation:</strong> {user?.occupation || '-'}</p>
          <p><strong>Salary:</strong> {user?.salary || '-'}</p>
          <Button variant="primary" className="mt-3" onClick={() => navigate('/edit-profile')}>Edit Profile</Button>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default Profile;
