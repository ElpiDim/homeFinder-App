import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Badge, Button, Spinner } from 'react-bootstrap';
import api from '../api';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/users/${userId}`)
      .then(res => setUser(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center mt-5"><Spinner animation="border" /></div>;
  if (!user) return <div className="text-center mt-5">User not found</div>;

  return (
    <Container className="py-5" style={{ maxWidth: '600px' }}>
      <Button variant="light" onClick={() => navigate(-1)} className="mb-3">← Back</Button>
      <Card className="shadow-sm border-0">
        <Card.Body className="text-center p-5">
          <img 
            src={user.profilePicture || '/default-avatar.jpg'} 
            alt={user.name} 
            className="rounded-circle mb-3"
            style={{ width: 120, height: 120, objectFit: 'cover' }} 
          />
          <h3>{user.name}</h3>
          <p className="text-muted">{user.role === 'client' ? 'Tenant' : 'Owner'}</p>
          
          <div className="text-start mt-4">
            <h5 className="border-bottom pb-2">Information</h5>
            <p><strong>Occupation:</strong> {user.occupation || '-'}</p>
            <p><strong>Age:</strong> {user.age || '-'}</p>
            <p><strong>Family Status:</strong> {user.hasFamily ? 'Family' : 'Single'} ({user.householdSize} people)</p>
            <p><strong>Pets:</strong> {user.hasPets ? 'Yes 🐶' : 'No'}</p>
            <p><strong>Smoker:</strong> {user.smoker ? 'Yes 🚬' : 'No'}</p>
            
            {/* Δείξε το μισθό μόνο αν είσαι Owner (προαιρετικό check) */}
            <p><strong>Annual Income:</strong> {user.salary ? `${user.salary}€` : '-'}</p>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default UserProfile;