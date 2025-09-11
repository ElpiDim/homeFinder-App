import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/authService';
import Logo from '../components/Logo';

function Register() {
   const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  const pageGradient = {
    minHeight: '100vh',
    background:
      'radial-gradient(900px circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%), linear-gradient(135deg, #006400 0%, #90ee90 100%)',
    backgroundAttachment: 'fixed',
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const { token, user } = await registerUser(formData);
      const isClient = user?.role === 'client';
      setMessage(
        `Registration successful! Redirecting to ${isClient ? 'onboarding' : 'dashboard'}...`
      );

      // Update auth context and local storage
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const target = isClient ? '/onboarding' : '/dashboard';
      setTimeout(() => navigate(target), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error while registering');
    }
  };

  return (
    <div style={pageGradient}>
      {/* Navbar (translucent) */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="ms-auto d-flex align-items-center gap-3">
          <Link
            to="/"
            className="btn btn-outline-secondary rounded-pill px-3"
            style={{ fontWeight: 600 }}
          >
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Register Card (με κενό κάτω από το navbar) */}
      <div
        className="container d-flex justify-content-center align-items-center"
        style={{
          minHeight: 'calc(100vh - 88px)',  // αφαιρεί περίπου το ύψος του navbar
          paddingTop: 24,                    // “ανάσα” κάτω από τη μπάρα
          paddingBottom: 24,
        }}
      >
        <div className="card shadow p-4" style={{ maxWidth: '640px', width: '100%', borderRadius: '1rem' }}>
          <h4 className="fw-bold mb-3">Create a new account</h4>
          {message && <div className="alert alert-info rounded-pill">{message}</div>}

          <form onSubmit={handleRegister}>
            <div className="mb-3">
                  <label className="form-label">
                  Email <span className="badge bg-danger ms-2">Required</span>
                </label>
                <input type="email" className="form-control" name="email" required onChange={handleChange} />
            </div>

            <div className="mb-3">
             <label className="form-label">
                Password <span className="badge bg-danger ms-2">Required</span>
              </label>
              <input type="password" className="form-control" name="password" required onChange={handleChange} />
            </div>

            <div className="mb-3">
               <label className="form-label">
                Role <span className="badge bg-danger ms-2">Required</span>
              </label>
              <select
                className="form-select"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="">-- Select role --</option>
                <option value="client">Client</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn rounded-pill"
                style={{
                  fontWeight: 700,
                  height: 44,
                  background: 'linear-gradient(135deg, #006400, #90ee90)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Register
              </button>
            </div>
          </form>

          <div className="mt-3 text-center">
            <span className="text-muted">Already have an account? </span>
            <Link
              to="/login"
              className="btn btn-link rounded-pill px-2 py-1"
              style={{ textDecoration: 'none', fontWeight: 600 }}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;