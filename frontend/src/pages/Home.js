import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer } from 'react-leaflet';
import axios from 'axios';
import GoogleMapView from '../components/GoogleMapView';

function Home() {
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await axios.get('/api/properties');
        setProperties(res.data);
      } catch (err) {
        console.error('Failed to load featured properties:', err);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="bg-white min-vh-100">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4 py-3">
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5 className="mb-0 fw-bold">insert app name here</h5>
        </div>

        {/* Right side: Login/Register */}
        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/login" className="btn btn-outline-primary">Login</Link>
          <Link to="/register" className="btn btn-primary">Register</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-5 bg-light d-flex flex-column justify-content-center align-items-center">
        <div className="container">
          <h1>
            <span className="text-black">insert app </span>
            <span className="text-primary">name here 🏠</span>
          </h1>
          <p className="lead">Find a house, make it your home in a click.</p>
        </div>
      </section>

      {/* Map + Search */}
      <div className="container my-5">
        <GoogleMapView properties={properties} height="320px" />
      </div>

      {/* Featured Properties */}
      <div className="container mb-5">
        <h4 className="fw-bold mb-3">Featured Properties</h4>
        <div className="row g-4">
          {properties.length === 0 ? (
            <p className="text-muted">No featured properties yet.</p>
          ) : (
            properties.map((prop) => (
              <div className="col-md-4" key={prop._id}>
                <div className="card border-0 shadow-sm h-100">
                  <div
                    className="rounded-top"
                    style={{
                      backgroundImage: `url(${prop.images?.[0] || 'https://via.placeholder.com/400x200?text=No+Image'})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      height: '200px'
                    }}
                  />
                  <div className="card-body">
                    <h5 className="card-title">{prop.title}</h5>
                    <p className="card-text text-muted">
                      {prop.beds} beds, {prop.baths} baths, {prop.size} sq ft
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
