import React, { useState } from 'react';
import axios from 'axios';
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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error while registering');
    }
  };

  return (
    <div className="bg-light min-vh-100">
      {/*  Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4 py-3">
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5 className="mb-0 fw-bold">Home Finder</h5>
        </div>
        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/" className="btn btn-outline-primary">Back to Home</Link>
        </div>
      </nav>

      {/*  Register Card */}
      <div className="container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="card shadow p-4" style={{ maxWidth: '600px', width: '100%' }}>
          <h4 className="fw-bold mb-3">Create a new account</h4>
          {message && <div className="alert alert-info">{message}</div>}

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
              <select className="form-select" name="role" onChange={handleChange}>
                <option value="client">Client</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div className="row">
              <div className="mb-3 col-md-6">
                <label className="form-label">Phone number</label>
                <input type="text" className="form-control" name="phone" onChange={handleChange} />
              </div>

              <div className="mb-3 col-md-6">
                <label className="form-label">Address</label>
                <input type="text" className="form-control" name="address" onChange={handleChange} />
              </div>
            </div>

            <div className="row">
              <div className="mb-3 col-md-6">
                <label className="form-label">Occupation</label>
                <input type="text" className="form-control" name="occupation" onChange={handleChange} />
              </div>

              <div className="mb-3 col-md-6">
                <label className="form-label">Salary (€)</label>
                <input type="number" className="form-control" name="salary" onChange={handleChange} />
              </div>
            </div>

            <div className="d-grid">
              <button type="submit" className="btn btn-primary">Register</button>
            </div>
          </form>

          <div className="mt-3 text-center">
            <span className="text-muted">Already have an account? </span>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
