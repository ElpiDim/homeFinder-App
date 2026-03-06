// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import './Login.css'; // Σύνδεση με το νέο CSS

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Για το ματάκι
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      // Κρατάμε ακριβώς τη λογική που είχες
      const result = await login(email, password);

      const token = result?.token || result?.data?.token;
      const user  = result?.user  || result?.data?.user || result;

      if (token) localStorage.setItem('token', token);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Onboarding check
      const completed = user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;
      const needsOnboarding = user?.role === 'client' && !completed;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
      
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      
      {/* ΑΡΙΣΤΕΡΗ ΠΛΕΥΡΑ: ΜΩΒ BACKGROUND & LOGO */}
      <div className="login-hero">
        <div className="login-logo-container">
          {/* Περνάμε το default χρώμα (π.χ. μωβ) στο Logo, όχι white */}
          <Logo /> 
        </div>
        <h1 className="hero-text">
          Find Your<br />Perfect Match
        </h1>
      </div>

      {/* ΔΕΞΙΑ ΠΛΕΥΡΑ: ΦΟΡΜΑ */}
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
            {/* Email Input */}
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

            {/* Password Input */}
            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label mb-0">Password</label>
                {/* Αν έχεις σελίδα forgot password, βάλε το link εδώ, αλλιώς # */}
                <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
              </div>
              
              <div className="password-wrapper mt-1">
                <input
                  type={showPassword ? "text" : "password"}
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
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <button type="button" className="btn-google" aria-label="Continue with Google">
              <span className="google-icon" aria-hidden="true">G</span>
              Continue with Google
            </button>
          </form>

          {/* Footer Link */}
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
