// src/pages/Layout.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  // κλείσιμο dropdown σε click έξω & Esc
  useEffect(() => {
    const onDocClick = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const brand = (
    <span
      className="fw-bold"
      style={{
        fontFamily: "'Poppins','Fredoka',sans-serif",
        textTransform: 'lowercase',
        background: 'linear-gradient(90deg, #2563eb, #9333ea)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}
    >
      homie
    </span>
  );

  const profileImg =
    user?.profilePicture
      ? (user.profilePicture.startsWith('http') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`)
      : '/default-avatar.jpg';

  return (
    <div
      className="min-vh-100 d-flex flex-column"
      style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)'
      }}
    >
      {/* Navbar */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 5000
        }}
      >
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
            <span role="img" aria-label="home">🏠</span> {brand}
          </Link>

          <div className="ms-auto d-flex align-items-center gap-3">
            {user ? (
              <>
                {/* Add Property (owners μόνο) */}
                {user.role === 'owner' && (
                  <Link
                    to="/add-property"
                    className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg,#2563eb,#9333ea)',
                      color: '#fff',
                      fontWeight: 600,
                      border: 'none'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Add Property
                  </Link>
                )}

                <Link to="/dashboard" className="text-dark text-decoration-none">Dashboard</Link>
                <Link to="/favorites" className="text-dark text-decoration-none">Favorites</Link>

                {/* Appointments προαιρετικά, αν το θες εδώ */}
                <Link to="/appointments" className="text-dark text-decoration-none">
                  Appointments
                </Link>

                {/* Profile: owner => dropdown, αλλιώς απλό κουμπί */}
                {user.role === 'owner' ? (
                  <div ref={profileMenuRef} className="position-relative">
                    <button
                      type="button"
                      className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                      style={{
                        background: 'white',
                        color: '#111827',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #9333ea)';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.border = 'none';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.color = '#111827';
                        e.currentTarget.style.border = '1px solid #e5e7eb';
                      }}
                      onClick={() => setShowProfileMenu((v) => !v)}
                    >
                      <img
                        src={profileImg}
                        alt="Profile"
                        className="rounded-circle"
                        style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #e5e7eb' }}
                      />
                      <span className="text-truncate" style={{ maxWidth: 140 }}>
                        {user.name || 'Profile'}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path
                          fillRule="evenodd"
                          d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
                        />
                      </svg>
                    </button>

                    {showProfileMenu && (
                      <div
                        className="position-absolute end-0 mt-2 bg-white border rounded shadow"
                        style={{ minWidth: 220, zIndex: 6500 }}
                      >
                        <button
                          type="button"
                          className="dropdown-item w-100 text-start"
                          onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                        >
                          Profile
                        </button>
                        <button
                          type="button"
                          className="dropdown-item w-100 text-start"
                          onClick={() => { setShowProfileMenu(false); navigate('/my-properties'); }}
                        >
                          My Properties
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill fw-semibold"
                    style={{
                      background: 'white',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.3s ease-in-out',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #9333ea)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.border = 'none';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.color = '#111827';
                      e.currentTarget.style.border = '1px solid #e5e7eb';
                    }}
                    onClick={() => navigate('/profile')}
                  >
                    <img
                      src={profileImg}
                      alt="Profile"
                      className="rounded-circle"
                      style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #e5e7eb' }}
                    />
                    <span className="text-truncate" style={{ maxWidth: 140 }}>
                      {user.name || 'Profile'}
                    </span>
                  </button>
                )}

                <button className="btn btn-outline-danger rounded-pill px-3" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-dark rounded-pill px-3">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn rounded-pill px-3"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                    color: '#fff',
                    fontWeight: 600,
                    border: 'none'
                  }}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-grow-1">{children}</main>

      <footer
        className="text-center text-muted py-3 mt-auto"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      >
        &copy; {new Date().getFullYear()} homie
      </footer>
    </div>
  );
}

export default Layout;
