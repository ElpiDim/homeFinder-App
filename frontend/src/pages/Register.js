// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/authService';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

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
    <AppShell
      container="sm"
      navRight={
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/" className="btn btn-brand-outline">Back home</Link>
          <Link to="/login" className="btn btn-brand">Sign in</Link>
        </div>
      }
      hero={
        <div className="surface-section text-center">
          <h1 className="fw-bold mb-2">Create your account</h1>
          <p className="text-muted mb-0">Join HomeFinder to unlock tailored matches and smart alerts.</p>
        </div>
      }
    >
      <div className="surface-card surface-card--glass">
        <form className="d-flex flex-column gap-3" onSubmit={handleRegister}>
          <div>
            <label className="form-label" htmlFor="email">Email <span className="badge bg-danger ms-2">Required</span></label>
            <input
              id="email"
              type="email"
              className="form-control"
              name="email"
              required
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="password">Password <span className="badge bg-danger ms-2">Required</span></label>
            <input
              id="password"
              type="password"
              className="form-control"
              name="password"
              required
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="form-label" htmlFor="role">Role <span className="badge bg-danger ms-2">Required</span></label>
            <select
              id="role"
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

          {message && <div className="alert alert-info rounded-pill mb-0">{message}</div>}

          <button
            type="submit"
            className="btn btn-brand w-100"
            style={{ height: 48 }}
          >
            Register
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-muted">Already have an account?</span>{' '}
          <Link to="/login" className="fw-semibold text-decoration-none">Login</Link>
        </div>
      </div>
    </AppShell>
  );
}

export default Register;
