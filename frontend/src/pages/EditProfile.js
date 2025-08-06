import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from 'react-bootstrap';


function EditProfile() {
  const { user,setUser } = useAuth();
  const navigate = useNavigate();


  // forma me stoixeia tou xrhsth
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    occupation: '',
    salary: '',
  });

  const [profilePicture, setProfilePicture] = useState(null);

  const [message, setMessage] = useState('');

  // Αν δεν υπάρχει user, περίμενε ή κάνε redirect
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
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const submissionData = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        submissionData.append(key, value);
      });
      if (profilePicture) {
        submissionData.append('profilePicture', profilePicture);
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: submissionData,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setMessage('Profile updated successfully!');

        console.log(' Updated user:', updatedUser);
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
    
    <div className="container mt-5">
      <Button 
          variant="outline-secondary"              className="mb-3"
            onClick={() => navigate(-1)}>
              Back 
            </Button>
      <h2>Edit Profile</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label>Name</label>
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
          <label>Phone</label>
          <input
            type="text"
            name="phone"
            className="form-control"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Address</label>
          <input
            type="text"
            name="address"
            className="form-control"
            value={formData.address}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Occupation</label>
          <input
            type="text"
            name="occupation"
            className="form-control"
            value={formData.occupation}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Salary</label>
          <input
            type="number"
            name="salary"
            className="form-control"
            value={formData.salary}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label>Profile Picture</label>
          <input
            type="file"
            className="form-control"
            accept="image/*"
            onChange={(e) => setProfilePicture(e.target.files[0])}
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default EditProfile;
