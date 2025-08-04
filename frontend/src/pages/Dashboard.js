import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import filterIcon from '../assets/filters.jpg';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [originalProperties, setOriginalProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef(null);
  const filterRef = useRef(null);

  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error("failed to fetch notifications", err);
      }
    };

    if (user) fetchNotifications();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        filterRef.current && !filterRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
        setShowFilters(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const response = await axios.get('/api/properties');
        setProperties(response.data);
        setOriginalProperties(response.data);
      } catch (err) {
        console.error('Error fetching properties:', err);
      }
    };

    const fetchFavorites = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/favorites', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(res.data.map(fav => fav._id));
      } catch (err) {
        console.error('Error fetching favorites', err);
      }
    };

    if (user) {
      fetchProperties();
      fetchFavorites();
    }
  }, [user]);

  const handleSearch = () => {
    if (searchTerm.trim() === '') return;
    const filtered = originalProperties.filter((prop) =>
      prop.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProperties(filtered);
  };

  const handleFavorite = async (propertyId) => {
    try {
      const token = localStorage.getItem('token');
      console.log("⭐ Sending favorite:", propertyId);

      if (favorites.includes(propertyId)) {
        await axios.delete(`/api/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await axios.post(`/api/favorites`, { propertyId }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setFavorites((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error("❌ Error updating favorite", err);
    }
  };

  const handleFilter = () => {
    const filtered = originalProperties.filter((prop) => {
      const matchLocation = locationFilter ? prop.location.toLowerCase().includes(locationFilter.toLowerCase()) : true;
      const matchType = typeFilter ? prop.type === typeFilter : true;
      const matchMinPrice = minPrice ? prop.price >= parseFloat(minPrice) : true;
      const matchMaxPrice = maxPrice ? prop.price <= parseFloat(maxPrice) : true;
      return matchLocation && matchType && matchMinPrice && matchMaxPrice;
    });
    setProperties(filtered);
  };

  return (
    <div className="dashboard-background">
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-4 fixed-navbar">
        <span className="navbar-brand">🏠 HomeFinder</span>
        <div className="ms-auto d-flex align-items-center gap-2 position-relative">
          <div ref={filterRef}>
            <button className="btn btn-light" onClick={() => setShowFilters(!showFilters)}>
              <img src={filterIcon} alt="Filter" style={{ height: '20px' }} />
            </button>
            {showFilters && (
              <div className="position-absolute bg-white shadow p-3 rounded" style={{ top: '40px', left: '0', zIndex: 1000, width: '250px', maxWidth: '90vw' }}>
                <h6>Filters</h6>
                <input type="text" placeholder="Location" className="form-control mb-2" onChange={(e) => setLocationFilter(e.target.value)} value={locationFilter} />
                <select className="form-control mb-2" onChange={(e) => setTypeFilter(e.target.value)} value={typeFilter}>
                  <option value="">Type</option>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                </select>
                <input type="number" placeholder="Min Price" className="form-control mb-2" onChange={(e) => setMinPrice(e.target.value)} value={minPrice} />
                <input type="number" placeholder="Max Price" className="form-control mb-2" onChange={(e) => setMaxPrice(e.target.value)} value={maxPrice} />
                <div className="d-flex gap-2">
                  <button className="btn btn-primary w-100" onClick={() => { handleFilter(); setShowFilters(false); }}>Apply</button>
                  <button className="btn btn-outline-secondary w-100" onClick={() => { setLocationFilter(''); setTypeFilter(''); setMinPrice(''); setMaxPrice(''); setProperties(originalProperties); setShowFilters(false); }}>Clear</button>
                </div>
              </div>
            )}
          </div>

          <input type="text" placeholder="Search properties..." className="form-control" style={{ maxWidth: '200px' }} onChange={(e) => setSearchTerm(e.target.value)} />
          <button className="btn btn-outline-light" onClick={handleSearch}>🔍</button>
          <button className="btn btn-primary" onClick={() => navigate('/profile')}>👤</button>
          <button className="btn btn-primary" onClick={() => navigate('/favorites')}>⭐</button>
          <button className="btn btn-primary" onClick={() => navigate('/messages')}>📬</button>

          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button className="btn btn-primary" onClick={() => setShowNotifications(prev => !prev)}>🔔</button>
            {showNotifications && (
              <div className="dropdown-menu show p-3 shadow" style={{ position: 'absolute', top: '40px', right: 0, minWidth: '250px', zIndex: 999, backgroundColor: 'white', borderRadius: '10px' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Notifications</strong>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowNotifications(false)}>×</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-muted mb-0">No notifications</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {notifications.map((note, idx) => (
                      <li key={idx} className="border-bottom py-2">
                        {note.type === "interest" && "Someone added your property to favorites."}
                        {note.type === "property_removed" && "A property you have added to your favorites has been removed."}
                        {note.type === "message" && "You have a new message."}
                        {note.type === "appointment" && "you have a new appointment."}
                        {!["interest", "property_removed", "message", "appointment"].includes(note.type) && "Νέα ειδοποίηση."}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <button className="btn btn-danger" onClick={handleLogout}>🚪</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="container-fluid mt-5">
          <div className="row">
            <div className="col-md-7">
              <div className="bg-white p-4 rounded shadow">
                <h2>Welcome, {user?.name}</h2>
                {user?.role === 'owner' && (
                  <div className="my-3">
                    <Link to="/add-property" className="btn btn-success">➕ Add Property</Link>
                  </div>
                )}
                <h4 style={{ marginTop: '50px' }}>All Properties</h4>

                {properties.length === 0 ? (
                  <p>No properties available.</p>
                ) : (
                  <div className="property-scroll-area">
                    <div className="row mt-4">
                      {properties.map((prop) => (
                        <div key={prop._id} className="col-md-6 mb-4">
                          <div className="card h-100 shadow-sm">
                            <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
                              {prop.images?.length > 0 && (
                                <img src={prop.images[0]} alt={prop.title} className="card-img-top" style={{ height: '200px', objectFit: 'cover' }} />
                              )}
                              <div className="card-body">
                                <h5 className="card-title">{prop.title}</h5>
                                <p className="card-text">
                                  📍 {prop.location} <br />
                                  💶 {prop.price} € <br />
                                  🏷️ {prop.type}
                                </p>
                              </div>
                            </Link>
                            <div className="card-footer bg-white border-top-0 text-end">
                              <button className="btn btn-sm btn-outline-warning" onClick={() => handleFavorite(prop._id)}>
                                {favorites.includes(prop._id) ? '★' : '☆'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-md-5">
              <div className="card shadow-sm" style={{ height: '100%', minHeight: '600px' }}>
                <MapContainer center={[37.9838, 23.7275]} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {properties.map((prop, idx) => (
                    prop.latitude && prop.longitude ? (
                      <Marker key={idx} position={[prop.latitude, prop.longitude]}>
                        <Popup>
                          <strong>{prop.title}</strong><br />
                          {prop.location}
                        </Popup>
                      </Marker>
                    ) : null
                  ))}
                </MapContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
