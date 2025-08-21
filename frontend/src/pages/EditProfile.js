import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function EditProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    occupation: '',
    salary: '',
  });

  const [previewUrl, setPreviewUrl] = useState('/default-avatar.jpg');
  const [message, setMessage] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // Pastel gradient (same as the others)
  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  useEffect(() => {
    if (!user) {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
    } else {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        address: user.address || '',
        occupation: user.occupation || '',
        salary: user.salary || '',
      });
      if (user.profilePicture) {
        setPreviewUrl(user.profilePicture);
      }
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    if (profilePicture) {
      formDataToSend.append('profilePicture', profilePicture);
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setMessage('Profile updated successfully!');

        const mergedUser = { ...user, ...updatedUser.user };
        if (mergedUser.profilePicture && !mergedUser.profilePicture.startsWith('http')) {
          mergedUser.profilePicture = `http://localhost:5000${mergedUser.profilePicture}`;
        }

        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
        navigate('/profile');
      } else {
        const error = await response.json();
        setMessage(error.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      setMessage('Server error');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm('Are you sure you want to delete your account? This cannot be undone.');
    if (!confirmDelete) return;

    try {
      const response = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to delete:', result.message);
        alert(result.message || 'Failed to delete account');
        return;
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      navigate('/');
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete account. Please try again.');
    }
  };

  if (!user) {
    return (
      <div style={pageGradient}>
        <div className="container mt-5">Loading profile...</div>
      </div>
    );
  }

  return (
    <div style={pageGradient} className="py-5">
      <div className="container bg-white shadow-sm rounded p-4" style={{ maxWidth: '600px' }}>
        <h4 className="fw-bold mb-4">Edit Profile</h4>
        {message && <div className="alert alert-info">{message}</div>}

        {/* Avatar upload */}
        <div className="text-center mb-4">
          <img
            src={previewUrl}
            alt="Avatar Preview"
            className="rounded-circle shadow"
            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
          />
          <div className="mt-2">
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Phone</label>
            <input
              type="text"
              name="phone"
              className="form-control"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="address"
              className="form-control"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Occupation</label>
            <input
              type="text"
              name="occupation"
              className="form-control"
              value={formData.occupation}
              onChange={handleChange}
            />
          </div>

          <div className="mb-4">
            <label className="form-label">Salary</label>
            <input
              type="number"
              name="salary"
              className="form-control"
              value={formData.salary}
              onChange={handleChange}
            />
          </div>

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary rounded-pill px-4"
            >
              Save Changes
            </button>
          </div>

        </form>

        <button
          type="button"
          className="btn btn-outline-danger w-100 mt-4 rounded-pill py-2"
          onClick={handleDeleteAccount}
        >
          🗑 Delete Account
        </button>
      </div>
    </div>
  );
}

export default EditProfile;
