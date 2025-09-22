// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { login, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const result = await login(email, password);
      const token = result?.token || result?.data?.token;
      const user  = result?.user  || result?.data?.user || result;

      if (token) localStorage.setItem('token', token);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
      }

      setMessage(`Welcome, ${user?.name || user?.email || ''}`);

      const completed = user?.onboardingCompleted ?? user?.hasCompletedOnboarding ?? false;
      const needsOnboarding = user?.role === 'client' && !completed;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login error';
      setMessage(msg);
    }
  };

  return (
    <AppShell
      container="sm"
      navRight={
        <div className="d-flex gap-2">
          <Link to="/" className="btn btn-brand-outline">Back home</Link>
          <Link to="/register" className="btn btn-brand">Create account</Link>
        </div>
      }
      hero={
        <div className="surface-section text-center">
          <h1 className="fw-bold mb-2">Welcome back</h1>
          <p className="text-muted mb-0">Sign in to continue matching with the right properties.</p>
        </div>
      }
    >
      <div className="surface-card surface-card--glass">
        <form className="d-flex flex-column gap-3" onSubmit={handleLogin}>
          <div>
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {message && <div className="alert alert-info rounded-pill mb-0">{message}</div>}

          <button type="submit" className="btn btn-brand w-100" style={{ height: 48 }}>
            Login
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-muted">Don’t have an account?</span>{' '}
          <Link to="/register" className="fw-semibold text-decoration-none">Register</Link>
        </div>
      </div>
    </AppShell>
  );
}

export default Login;
