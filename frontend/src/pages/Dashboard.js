// src/pages/Dashboard.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="container mt-5">
      <h2>Welcome, {user?.name}</h2>

      <ul className="list-group mt-4">
        <li className="list-group-item" onClick={() => navigate('/profile')}>
          👤 Profile
        </li>
        <li className="list-group-item" onClick={() => navigate('/favorites')}>
          ⭐ Favorites
        </li>
        <li className="list-group-item" onClick={()=> navigate('/messages')}>
          📬Messages
        </li>
        <li className="list-group-item" onClick={() => navigate('/notifications')}>
          🔔 Notifications
        </li>
        <li className="list-group-item text-danger" onClick={handleLogout}>
          🚪 Logout
        </li>
      </ul>
    </div>
  );
}

export default Dashboard;
