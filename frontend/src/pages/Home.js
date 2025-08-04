import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-background d-flex flex-column justify-content-center align-items-center vh-100">
    <div className="container text-center mt-4">
      <h1>
        <span className = "text-black"> Home Fi</span>
        <span className = "text-white">nder 🏠</span></h1>
      <p className="lead">Find a house, make it your home in a click.</p>

      <div className="mt-3">
        <Link to="/login" className="btn btn-primary mx-2">
          Login
        </Link>
        <Link to="/register" className="btn btn-outline-primary mx-2">
          Register
        </Link>
      </div>

    </div>
    </div>
  );
}

export default Home;
