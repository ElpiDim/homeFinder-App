// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { login, setUser } = useAuth(); // <- χρειαζόμαστε setUser για να ενημερώσουμε το context
  const navigate = useNavigate();

  const pageGradient = {
    minHeight: '100vh',
    background:
      'radial-gradient(900px circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%), linear-gradient(135deg, #4b0082 0%, #e0b0ff 100%)',
    backgroundAttachment: 'fixed',
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // login() πρέπει να επιστρέφει τουλάχιστον { user, token }
      const result = await login(email, password);

      // Καλύπτουμε και τα δύο πιθανά σχήματα: είτε γυρνάει object, είτε σκέτο user
      const token = result?.token || result?.data?.token;
      const user  = result?.user  || result?.data?.user || result;

      if (token) localStorage.setItem('token', token);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }

      setMessage(`Welcome, ${user?.name || user?.email || ''}`);

      // Αν δεν έχει ολοκληρώσει onboarding -> /onboarding, αλλιώς /dashboard
      const completed = user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;
       const needsOnboarding = user?.role === 'client' && !completed;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login error';
      setMessage(msg);
    }
  };

  return (
    <div style={pageGradient}>
      {/* Navbar (compact + glass) */}
      <nav
        className="navbar navbar-expand-lg px-3 compact-nav shadow-sm glass-bg"
        style={{ position: 'sticky', top: 0, zIndex: 5000 }}
      >
        <div className="d-flex align-items-center gap-2">
          <Logo as="h5" className="mb-0 logo-white" />
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/" className="btn btn-brand-outline rounded-pill px-3 fw-semibold">
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Login Card */}
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="card shadow p-4" style={{ maxWidth: '500px', width: '100%' }}>
          <h4 className="fw-bold mb-3">Sign in to your account</h4>
          {message && <div className="alert alert-info rounded-pill">{message}</div>}

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
              <button type="submit" className="btn btn-brand rounded-pill" style={{ height: 44, fontWeight: 700 }}>
                Login
              </button>
            </div>
          </form>

          <div className="mt-3 text-center">
            <span className="text-muted">Don’t have an account? </span>
            <Link to="/register" className="btn btn-link rounded-pill px-2 py-1" style={{ textDecoration: 'none', fontWeight: 600 }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
