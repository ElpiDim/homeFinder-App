import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/authService';
import api from 'api';
import Logo from '../components/Logo';
import './Register.css';

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '',
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const googleClientIdConfigured = Boolean(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  const { setToken, setUser } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const finishAuth = (token, user) => {
    setToken(token);
    setUser(user);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    const isClient = user?.role === 'client';
    setMessage(`Success! Redirecting to ${isClient ? 'onboarding' : 'dashboard'}...`);

    setTimeout(() => {
      const target = isClient ? '/onboarding' : '/dashboard';
      navigate(target);
    }, 1500);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const { token, user } = await registerUser(formData);
      finishAuth(token, user);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!formData.role) {
      setMessage('Please select whether you are a Client or Owner first.');
      return;
    }

    if (!credentialResponse?.credential) {
      setMessage('Google registration failed. Missing credential.');
      return;
    }

    setMessage('');
    setGoogleLoading(true);

    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
        role: formData.role,
      });

      const { token, user } = res.data;
      finishAuth(token, user);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Google registration failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setMessage('Google registration failed. Please try again.');
  };

  return (
    <div className="register-page">
      <div className="register-hero">
        <div className="register-logo-container">
          <Logo />
        </div>
        <h1 className="hero-text">
          Join our<br />Community
        </h1>
      </div>

      <div className="register-form-container">
        <div className="register-content">
          <div className="register-header">
            <h2 className="register-title">Create a new account</h2>
            <p className="register-subtitle">It's free and takes less than a minute.</p>
          </div>

          {message && (
            <div
              className={`alert py-2 ${message.includes('Success') ? 'alert-success' : 'alert-danger'}`}
              style={{ fontSize: '0.9rem' }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control-custom"
                placeholder="you@example.com"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control-custom"
                placeholder="Create a strong password"
                required
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">I am a...</label>
              <select
                className="form-control-custom form-select-custom"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select your role</option>
                <option value="client">Client (Tenant/Buyer)</option>
                <option value="owner">Property Owner</option>
              </select>
            </div>

            <button type="submit" className="btn-register" disabled={loading || googleLoading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            {googleClientIdConfigured ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signup_with"
                    shape="pill"
                    width="320"
                  />
                </div>

                {googleLoading && (
                  <div className="text-center mt-2" style={{ fontSize: '0.9rem', color: '#666' }}>
                    Signing up with Google...
                  </div>
                )}
              </>
            ) : (
              <div className="alert alert-warning py-2 text-center" style={{ fontSize: '0.9rem' }}>
                Google registration is unavailable: missing REACT_APP_GOOGLE_CLIENT_ID configuration.
              </div>
            )}
          </form>

          <div className="login-text">
            Already have an account?
            <Link to="/login" className="login-link">Log In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;