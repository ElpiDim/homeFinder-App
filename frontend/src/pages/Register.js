import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'client', // 'owner' ή 'client'
    phone: '',
    address: '',
    occupation: '',
    salary: ''
  });

  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      setMessage('Register successfull! Moving to the login page..');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error while registering');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Register</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleRegister}>
        <div className="mb-3">
          <label>Name</label>
          <input type="text" className="form-control" name="name" required onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Email</label>
          <input type="email" className="form-control" name="email" required onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input type="password" className="form-control" name="password" required onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Role</label>
          <select className="form-select" name="role" onChange={handleChange}>
            <option value="client">Client</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div className="mb-3">
          <label>Phone number</label>
          <input type="text" className="form-control" name="phone" onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Address</label>
          <input type="text" className="form-control" name="address" onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Occupation</label>
          <input type="text" className="form-control" name="occupation" onChange={handleChange} />
        </div>

        <div className="mb-3">
          <label>Salary (€)</label>
          <input type="number" className="form-control" name="salary" onChange={handleChange} />
        </div>

        <button type="submit" className="btn btn-primary">Register</button>
      </form>
    </div>
  );
}

export default Register;
