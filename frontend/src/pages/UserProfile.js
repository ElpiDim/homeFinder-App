import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchUser = async () => {
      try {
        const { data } = await api.get(`/users/${userId}`);
        if (!cancelled) {
          setUser(data);
        }
      } catch (err) {
        console.error("Failed to fetch user profile", err);
        if (!cancelled) {
          setError("Failed to load user profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }

    return () => { cancelled = true; };
  }, [userId]);

  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

  if (loading) {
    return (
      <div style={pageGradient}>
        <div className="container mt-5">Loading profile…</div>
      </div>
    );
  }

  if (error || !user) {
    return (
        <div style={pageGradient} className="py-5">
            <div className="container">
                <div className="alert alert-danger">{error || "User not found"}</div>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>Go Back</button>
            </div>
        </div>
    )
  }

  const isClient = user.role === 'client';
  const profilePicture = user.profilePicture || '/default-avatar.jpg';
  const joinedDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown';

  const bool = (v) => (v === true ? 'Yes' : v === false ? 'No' : '-');
  const orDash = (v) => (v === 0 || v ? v : '-');

  const p = user.preferences || {};
  const intent = p?.intent || (p?.dealType === 'sale' ? 'buy' : 'rent');

  return (
    <div style={pageGradient} className="py-5">
      <div className="container" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div className="p-4 rounded-4 shadow-sm bg-white border d-flex justify-content-between align-items-center mb-4">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-secondary rounded-pill me-3"
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <div
              className="rounded-circle me-3"
              style={{
                width: 60,
                height: 60,
                backgroundImage: `url(${profilePicture})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div>
              <h5 className="mb-1 fw-bold">{user.name || user.email}</h5>
              <div className="text-muted">Joined in {joinedDate}</div>
              <div className="badge bg-primary ms-2">{user.role}</div>
            </div>
          </div>
        </div>

        {/* Client view */}
        {isClient && (
          <>
            {/* Personal Information */}
            <div className="p-4 rounded-4 shadow-sm bg-white border mb-4">
              <h5 className="fw-bold mb-3">Personal Information</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="text-muted small">Name</label>
                  <div>{user.name || '-'}</div>
                </div>
                {/* Email is typically private in public profile unless decided otherwise, but here we can show it as in Profile.js */}
                <div className="col-md-6">
                  <label className="text-muted small">Email</label>
                  <div>{user.email}</div>
                </div>
                <div className="col-md-6">
                   {/* Phone might be sensitive */}
                  <label className="text-muted small">Phone</label>
                  <div>{user.phone || '-'}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Age</label>
                  <div>{orDash(user.age)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Household Size</label>
                  <div>{orDash(user.householdSize)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Has Family</label>
                  <div>{bool(user.hasFamily)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Has Pets</label>
                  <div>{bool(user.hasPets)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Smoker</label>
                  <div>{bool(user.smoker)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Willing to Have Roommate</label>
                  <div>{bool(user.isWillingToHaveRoommate)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Occupation</label>
                  <div>{user.occupation || '-'}</div>
                </div>
                {/* Salary might be sensitive, maybe hide it? Profile.js shows it. I'll show it for now as it's for the other user to see if they are a good match */}
                {/* <div className="col-md-6">
                  <label className="text-muted small">Salary</label>
                  <div>{orDash(user.salary)}</div>
                </div> */}
              </div>
            </div>

            {/* Preferences */}
            <div className="p-4 rounded-4 shadow-sm bg-white border mb-4">
              <h5 className="fw-bold mb-3">Preferences</h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="text-muted small">Location</label>
                  <div>{p.location || '-'}</div>
                </div>
                {intent === 'rent' ? (
                  <>
                    <div className="col-md-3">
                      <label className="text-muted small">Rent Min (€)</label>
                      <div>{orDash(p.rentMin)}</div>
                    </div>
                    <div className="col-md-3">
                      <label className="text-muted small">Rent Max (€)</label>
                      <div>{orDash(p.rentMax)}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-md-3">
                      <label className="text-muted small">Purchase Min (€)</label>
                      <div>{orDash(p.priceMin)}</div>
                    </div>
                    <div className="col-md-3">
                      <label className="text-muted small">Purchase Max (€)</label>
                      <div>{orDash(p.priceMax)}</div>
                    </div>
                  </>
                )}
                <div className="col-md-3">
                  <label className="text-muted small">Sqm Min</label>
                  <div>{orDash(p.sqmMin)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Sqm Max</label>
                  <div>{orDash(p.sqmMax)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Bedrooms</label>
                  <div>{orDash(p.bedrooms)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Bathrooms</label>
                  <div>{orDash(p.bathrooms)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Furnished</label>
                  <div>{bool(p.furnished)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Pets Allowed</label>
                  <div>{bool(p.petsAllowed)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Smoking Allowed</label>
                  <div>{bool(p.smokingAllowed)}</div>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Year Built Min</label>
                  <div>{orDash(p.yearBuiltMin)}</div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small">Heating Type</label>
                  <div>{p.heatingType || '-'}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Owner view */}
        {!isClient && (
          <div className="p-4 rounded-4 shadow-sm bg-white border mb-4">
            <h5 className="fw-bold mb-3">Owner Information</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="text-muted small">Name</label>
                <div>{user.name || '-'}</div>
              </div>
              <div className="col-md-6">
                <label className="text-muted small">Email</label>
                <div>{user.email}</div>
              </div>
              <div className="col-md-6">
                <label className="text-muted small">Phone</label>
                <div>{user.phone || '-'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
