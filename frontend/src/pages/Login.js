import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/authService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Same vibrant gradient used on Login
  const pageGradient = {
    minHeight: '100vh',
    background:
      'radial-gradient(900px circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%), linear-gradient(135deg, #06B6D4 0%, #3B82F6 40%, #8B5CF6 100%)',
    backgroundAttachment: 'fixed',
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const data = await loginUser({ email, password });
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      setMessage(`Welcome, ${data.user.name}`);
      navigate('/dashboard');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Login error');
    }
  };

  return (
    <div style={pageGradient}>
      {/* Navbar (translucent over the gradient) */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5 className="mb-0 fw-bold">Homie</h5>
        </div>
        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/" className="btn btn-outline-secondary rounded-pill px-4">Back to Home</Link>
        </div>
      </nav>

      {/* Login Card */}
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="card shadow p-4" style={{ maxWidth: '500px', width: '100%' }}>
          <h4 className="fw-bold mb-3">Sign in to your account</h4>
          {message && <div className="alert alert-info">{message}</div>}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="d-grid">
              <button type="submit" className="btn btn-primary">Login</button>
            </div>
          </form>

          <div className="mt-3 text-center">
            <span className="text-muted">Don’t have an account? </span>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
