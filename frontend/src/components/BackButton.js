import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function BackButton({ text = 'Back to Dashboard', to = '/dashboard' }) {
  const navigate = useNavigate();
  return (
    <Button
      variant="outline-secondary"
      className="rounded-pill px-3 mb-3"
      onClick={() => navigate(to)}
    >
      ← {text}
    </Button>
  );
}
