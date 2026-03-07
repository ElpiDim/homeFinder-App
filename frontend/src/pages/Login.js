import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import Logo from '../components/Logo';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, setUser, setToken } = useAuth();
  const navigate = useNavigate();

  const finishAuth = (token, user) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (setToken) setToken(token);
    }

    if (user) {
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    }

    const completed = user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;
    const needsOnboarding = user?.role === 'client' && !completed;
    navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const result = await login(email, password);

      const token = result?.token || result?.data?.token;
      const user = result?.user || result?.data?.user || result;

      finishAuth(token, user);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setMessage('Google login failed. Missing credential.');
      return;
    }

    setMessage('');
    setGoogleLoading(true);

    try {
      const res = await api.post('/auth/google', {
        credential: credentialResponse.credential,
      });

      const { token, user } = res.data;
      finishAuth(token, user);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Google login failed. Please try again.';
      setMessage(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setMessage('Google login failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-logo-container">
          <Logo />
        </div>
        <h1 className="hero-text">
          Find Your<br />Perfect Match
        </h1>
      </div>

      <div className="login-form-container">
        <div className="login-content">
          <div className="login-header">
            <h2 className="login-title">Log in to Your Account</h2>
            <p className="login-subtitle">Welcome back! Please enter your details.</p>
          </div>

          {message && (
            <div className="alert alert-danger py-2" style={{ fontSize: '0.9rem' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email or Username</label>
              <input
                type="email"
                className="form-control-custom"
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label mb-0">Password</label>
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>

              <div className="password-wrapper mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control-custom"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading || googleLoading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="continue_with"
                shape="pill"
                width="320"
              />
            </div>

            {googleLoading && (
              <div className="text-center mt-2" style={{ fontSize: '0.9rem', color: '#666' }}>
                Signing in with Google...
              </div>
            )}
          </form>

          <div className="signup-text">
            Don't have an account?
            <Link to="/register" className="signup-link">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;