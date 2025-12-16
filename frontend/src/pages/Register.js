// src/pages/Register.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/authService';
import Logo from '../components/Logo';
import './Register.css'; // Σύνδεση με το νέο CSS

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '', // Default κενό για να αναγκάσουμε επιλογή
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      const { token, user } = await registerUser(formData);
      
      // Update context & storage
      setToken(token);
      setUser(user);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      const isClient = user?.role === 'client';
      setMessage(`Success! Redirecting to ${isClient ? 'onboarding' : 'dashboard'}...`);

      // Καθυστέρηση για να δει το μήνυμα επιτυχίας
      setTimeout(() => {
        const target = isClient ? '/onboarding' : '/dashboard';
        navigate(target);
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      
      {/* ΑΡΙΣΤΕΡΗ ΠΛΕΥΡΑ (HERO) */}
      <div className="register-hero">
        <div className="register-logo-container">
          <Logo />
        </div>
        <h1 className="hero-text">
          Join our<br />Community
        </h1>
      </div>

      {/* ΔΕΞΙΑ ΠΛΕΥΡΑ (ΦΟΡΜΑ) */}
      <div className="register-form-container">
        <div className="register-content">
          <div className="register-header">
            <h2 className="register-title">Create a new account</h2>
            <p className="register-subtitle">It's free and takes less than a minute.</p>
          </div>

          {message && (
            <div className={`alert py-2 ${message.includes('Success') ? 'alert-success' : 'alert-danger'}`} style={{ fontSize: '0.9rem' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleRegister}>
            {/* Email Input */}
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

            {/* Password Input */}
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

            {/* Role Select */}
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

            {/* Submit Button */}
            <button type="submit" className="btn-register" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Footer Link */}
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