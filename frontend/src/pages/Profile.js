import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return <div className="container mt-5">Loading profile...</div>;

  return (
    <div className="container-fluid py-5" style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}>
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="d-flex align-items-center gap-3 mb-4">
            <div
              className="rounded-circle bg-light bg-cover bg-center"
              style={{ width: '60px', height: '60px', backgroundImage: 'url(https://i.pravatar.cc/100?img=47)' }}
            ></div>
            <div>
              <h4 className="fw-bold mb-0">{user.name}</h4>
              <p className="text-muted mb-0">Joined in 2021</p>
            </div>
          </div>

          <h5 className="fw-bold mb-3">Personal Information</h5>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input className="form-control" value={user.name} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input className="form-control" value={user.email} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label">Phone</label>
            <input className="form-control" value={user.phone || ''} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label">Address</label>
            <input className="form-control" value={user.address || ''} disabled />
          </div>
          <div className="mb-3">
            <label className="form-label">Occupation</label>
            <input className="form-control" value={user.occupation || ''} disabled />
          </div>
          <div className="mb-4">
            <label className="form-label">Salary</label>
            <input className="form-control" value={user.salary || ''} disabled />
          </div>

          <div className="d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/edit-profile')}>
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
