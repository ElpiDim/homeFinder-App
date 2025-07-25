import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="container text-center mt-5">
      <h1>Home Finder 🏠</h1>
      <p className="lead">Find a house, make it your home in a click.</p>

      <div className="mt-4">
        <Link to="/login" className="btn btn-primary mx-2">
          Login
        </Link>
        <Link to="/register" className="btn btn-outline-primary mx-2">
          Register
        </Link>
      </div>

      <div className="mt-5">
        <img 
          src="/picasso.jpg" 
          alt="home" 
          className="img-fluid rounded shadow"
          style={{ maxHeight: '300px' }}
        />
      </div>
    </div>
  );
}

export default Home;
