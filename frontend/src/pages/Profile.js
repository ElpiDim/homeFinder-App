// src/pages/Profile.jsx
import React, { useEffect, useMemo} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const pageGradient = useMemo(() => ({
    minHeight: "100vh",
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

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

  return (
    <div style={pageGradient}>
      {/* Top bar με back πάνω-αριστερά */}
      <nav
        className="px-3 px-sm-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 5000,
        }}
      >
        <button
          type="button"
          className="btn rounded-pill fw-semibold"
          style={{
            background: '#fff',
            color: '#111827',
            border: '1px solid #e5e7eb',
            transition: 'all .25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
          }}
          onClick={() => navigate('/dashboard')}
        >
          ← Back to dashboard
        </button>
      </nav>

      <div
        className="container py-5"
        style={{ fontFamily: 'Manrope, "Noto Sans", sans-serif' }}
      >
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="d-flex align-items-center gap-3 mb-4">
              <div
                className="rounded-circle bg-light bg-cover bg-center shadow"
                style={{
                  width: '60px',
                  height: '60px',
                  backgroundImage: `url(${profilePicture})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div>
                <h4 className="fw-bold mb-0">{user.name}</h4>
                <p className="text-muted mb-0">Joined in {joinedDate}</p>
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

            <div className="d-flex justify-content-end">
              <button
                className="btn btn-primary rounded-pill px-4"
                onClick={() => navigate('/edit-profile')}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
