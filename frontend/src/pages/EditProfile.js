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
  const [avatar, setAvatar] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('/default-avatar.png');
  const [message, setMessage] = useState('');

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
      if (user.avatar) {
        setPreviewUrl(user.avatar);
      }
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    const form = new FormData();
    form.append('name', formData.name);
    form.append('phone', formData.phone);
    form.append('address', formData.address);
    form.append('occupation', formData.occupation);
    form.append('salary', formData.salary);
    if (avatar) form.append('avatar', avatar);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setMessage('Profile updated successfully!');
        setUser(updatedUser.user);
        localStorage.setItem('user', JSON.stringify(updatedUser.user));
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

  if (!user) return <div className="container mt-5">Loading profile...</div>;

  return (
    <div className="bg-light min-vh-100 py-5">
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
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;
