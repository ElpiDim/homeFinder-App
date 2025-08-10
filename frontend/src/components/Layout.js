import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  return (
    <div className="bg-app min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-expand-lg navbar-dark navbar-app">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">App name</Link>
          <div className="ms-auto d-flex align-items-center gap-3">
            {user ? (
              <>
                <Link to="/dashboard" className="nav-link text-white">Dashboard</Link>
                <Link to="/favorites" className="nav-link text-white">Favorites</Link>
                <Link to="/profile" className="nav-link text-white">Profile</Link>
                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-light btn-sm">Login</Link>
                <Link to="/register" className="btn btn-warning btn-sm">Register</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className="flex-grow-1">
        {children}
      </main>
      <footer className="text-center text-white py-3 navbar-app mt-auto">
        &copy; {new Date().getFullYear()} app
      </footer>
    </div>
  );
}

export default Layout;