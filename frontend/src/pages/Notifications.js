import React from 'react';
import { Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';


function Notifications() {
  const navigate = useNavigate();

  return (
    <div className="container mt-5">
      <Button 
          variant="outline-secondary"              className="mb-3"
            onClick={() => navigate('/dashboard')}>
              Back 
            </Button>
      <h2>Notifications 🔔</h2>
      <p>No new notifications.</p>
      {/* Later: render notifications from backend */}
    </div>
  );
}

export default Notifications;
