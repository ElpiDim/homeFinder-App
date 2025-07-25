import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import { loginUser }  from '../services/authService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const {setUser} = useAuth();

  const navigate = useNavigate(); // <-- αυτό θα κάνεις redirect

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const data = await loginUser({ email, password });
      localStorage.setItem('user', JSON.stringify(data.user));

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setMessage(`Welcome, ${data.user.name}`);

      // Κάνε redirect στην properties
      navigate('/dashboard');

    } catch (err) {
      setMessage(err.response?.data?.message || 'Login error');
    }
  };

  return (
    <div className="container mt-5">
      <h2>User Login</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label>Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
