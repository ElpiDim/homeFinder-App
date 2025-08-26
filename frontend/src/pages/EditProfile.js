import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, updateUserProfile } from '../services/userService';

function EditProfile() {
  const {setUser } = useAuth();

  const [formData, setFormData] = useState({
     age: '',
    householdSize: 1,
    hasFamily: false,
    hasPets: false,
    smoker: false,
    occupation: '',
    salary: '',
  });

  
  const [message, setMessage] = useState('');

  useEffect(() => {
     const loadUser = async () => {
      try {
        const data = await getUserProfile();
        setFormData({
          age: data.age || '',
          householdSize: data.householdSize || 1,
          hasFamily: data.hasFamily || false,
          hasPets: data.hasPets || false,
          smoker: data.smoker || false,
          occupation: data.occupation || '',
          salary: data.salary || '',
        });
        setUser(data);
      } catch (err) {
        console.error(err);
      }
   };
    loadUser();
  }, [setUser]);
  const handleChange = (e) => {
 const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const updated = await updateUserProfile(formData);
      setUser(updated);
      setMessage('Profile updated successfully!');
    } catch (err) {
    setMessage(err.response?.data?.message || 'Update failed');
    }
  };



  return (
        <div className="container mt-4">
      <h3>Edit Profile</h3>
      {message && <div className="alert alert-info">{message}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Age</label>
          <input type="number" name="age" className="form-control" value={formData.age} onChange={handleChange} />
</div>
   <div className="mb-3">
          <label className="form-label">Household Size</label>
          <input type="number" name="householdSize" className="form-control" value={formData.householdSize} onChange={handleChange} />
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="hasFamily" className="form-check-input" checked={formData.hasFamily} onChange={handleChange} />
          <label className="form-check-label">Has Family</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="hasPets" className="form-check-input" checked={formData.hasPets} onChange={handleChange} />
          <label className="form-check-label">Has Pets</label>
        </div>
        <div className="form-check mb-3">
          <input type="checkbox" name="smoker" className="form-check-input" checked={formData.smoker} onChange={handleChange} />
          <label className="form-check-label">Smoker</label>
        </div>
        <div className="mb-3">
          <label className="form-label">Occupation</label>
          <input type="text" name="occupation" className="form-control" value={formData.occupation} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Salary</label>
          <input type="number" name="salary" className="form-control" value={formData.salary} onChange={handleChange} />
        </div>
        <button type="submit" className="btn btn-primary">Save</button>
      </form>
        
    </div>
  );
}

export default EditProfile;
