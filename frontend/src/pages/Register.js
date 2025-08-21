import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client',
    phone: '',
    address: '',
    occupation: '',
    salary: ''
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  // ίδιο vibrant gradient με Login
  const pageGradient = {
    minHeight: '100vh',
    background:
       'radial-gradient(900px circle at 20% 15%, rgba(255,255,255,0.14), rgba(255,255,255,0) 45%), linear-gradient(135deg, #ff0000 0%, #ffeb3b 100%)',
    backgroundAttachment: 'fixed',
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', formData);
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
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
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5
            className="mb-0 fw-bold"
            style={{
              fontFamily: "'Poppins','Fredoka',sans-serif",
              textTransform: 'lowercase',
               background: 'linear-gradient(90deg,#ff0000,#ffeb3b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            homie
          </h5>
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

      {/* Register Card */}
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="card shadow p-4" style={{ maxWidth: '640px', width: '100%' }}>
          <h4 className="fw-bold mb-3">Create a new account</h4>
          {message && <div className="alert alert-info rounded-pill">{message}</div>}

          <form onSubmit={handleRegister}>
            <div className="row">
              <div className="mb-3 col-md-6">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" name="name" required onChange={handleChange} />
              </div>

              <div className="mb-3 col-md-6">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" name="email" required onChange={handleChange} />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input type="password" className="form-control" name="password" required onChange={handleChange} />
            </div>

            <div className="mb-3">
              <label className="form-label">Role</label>
              <select className="form-select" name="role" onChange={handleChange} defaultValue="client">
                <option value="client">Client</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            {/* Phone + Address */}
            <div className="row">
              <div className="mb-3 col-md-6">
                <label className="form-label">Phone number</label>
                <input type="tel" className="form-control" name="phone" onChange={handleChange} />
              </div>
              <div className="mb-3 col-md-6">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" name="address" onChange={handleChange} />
              </div>
            </div>

            {/* Occupation + Salary */}
            <div className="row">
              <div className="mb-3 col-md-6">
                <label className="form-label">Occupation</label>
                <input type="text" className="form-control" name="occupation" onChange={handleChange} />
              </div>
              <div className="mb-3 col-md-6">
                <label className="form-label">Salary/year (€)</label>
                <input type="number" className="form-control" name="salary" onChange={handleChange} />
              </div>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                className="btn rounded-pill"
                style={{
                  fontWeight: 700,
                  height: 44,
                  background: 'linear-gradient(135deg, #ff0000, #ffeb3b)',
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
