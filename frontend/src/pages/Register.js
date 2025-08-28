// src/pages/Register.js
import React, { useState } from 'react';
import { registerUser } from '../services/authService'; // προσαρμόσε το path αν χρειάζεται
import { useNavigate, Link } from 'react-router-dom';
import Logo from "../components/Logo";

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const pageGradient = {
    minHeight: '100vh',
    background:
      'radial-gradient(900px circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%), linear-gradient(135deg, #006400 0%, #90ee90 100%)',
    backgroundAttachment: 'fixed',
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role.toLowerCase(),
      };
      await registerUser(payload);
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Error while registering');
    }
  };

  return (
    <div style={pageGradient}>
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Link to="/" className="text-decoration-none">
            <Logo as="h5" className="mb-0 logo-in-nav" />
          </Link>
        </div>
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

      <div
        className="container d-flex justify-content-center align-items-center"
        style={{ minHeight: 'calc(100vh - 88px)', paddingTop: 24, paddingBottom: 24 }}
      >
        <div className="card shadow p-4" style={{ maxWidth: 520, width: '100%', borderRadius: '1rem' }}>
          <h4 className="fw-bold mb-3">Create a new account</h4>
          {message && <div className="alert alert-info rounded-pill">{message}</div>}

          <form onSubmit={handleRegister}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Role</label>
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
            <Link to="/login" className="btn btn-link rounded-pill px-2 py-1" style={{ textDecoration: 'none', fontWeight: 600 }}>
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
