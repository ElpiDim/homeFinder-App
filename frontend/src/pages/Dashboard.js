import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import filterIcon from '../assets/filters.jpg';

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [originalProperties, setOriginalProperties] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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
    if (user) {
      axios.get('/api/properties').then((res) => {
        setProperties(res.data);
        setOriginalProperties(res.data);
      });
      axios.get('/api/favorites', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then((res) => {
        setFavorites(res.data.map((fav) => fav._id));
      });
      axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      }).then((res) => {
        setNotifications(res.data);
      });
    }
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

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    const filtered = originalProperties.filter((p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProperties(filtered);
  };

  const handleFavorite = async (propertyId) => {
    const token = localStorage.getItem('token');
    try {
      if (favorites.includes(propertyId)) {
        await axios.delete(`/api/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFavorites(favorites.filter(id => id !== propertyId));
      } else {
        await axios.post('/api/favorites', { propertyId }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setFavorites([...favorites, propertyId]);
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const handleFilter = () => {
    const filtered = originalProperties.filter((p) => {
      const matchLocation = locationFilter ? p.location.toLowerCase().includes(locationFilter.toLowerCase()) : true;
      const matchType = typeFilter ? p.type === typeFilter : true;
      const matchMin = minPrice ? p.price >= parseFloat(minPrice) : true;
      const matchMax = maxPrice ? p.price <= parseFloat(maxPrice) : true;
      return matchLocation && matchType && matchMin && matchMax;
    });
    setProperties(filtered);
  };

  return (
    <div className="bg-light min-vh-100">
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom px-4 py-3">
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5 className="mb-0 fw-bold">Home Finder</h5>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/favorites" className="text-dark text-decoration-none">Favorites</Link>
          <Link to="/profile" className="text-dark text-decoration-none">Profile</Link>

          {/* Notifications Dropdown */}
          <div ref={dropdownRef} className="position-relative">
            <button
              className="btn btn-link text-decoration-none text-dark p-0"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              Notifications
            </button>
            {showNotifications && (
            <div
              className="position-absolute bg-white border shadow p-3 rounded"
              style={{
                top: '100%',
                left: 0,
                minWidth: '250px',
                maxHeight: '300px', // περιορίζει το ύψος
                overflowY: 'auto',  // scroll κάθετα αν χρειαστεί
                zIndex: 1000
              }}
            >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Notifications</strong>
                  <button className="btn-close" onClick={() => setShowNotifications(false)}></button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-muted mb-0">No notifications</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {notifications.map((note, i) => (
                      <li key={i} className="border-bottom py-2 small">
                        {note.referenceId ? (
                        <Link
                          to={`/property/${note.referenceId}`}
                          className="text-decoration-none text-dark"
                          onClick={() => setShowNotifications(false)}
                        >
                          {note.type === "interest" && `${note.senderId?.name || 'Someone'} sent an interest.`}
                          {note.type === "favorite" && `${note.senderId?.name || 'Someone'} added your property to favorites.`}
                          {note.type === "property_removed" && note.message}
                          {note.type === "message" && `New message received.`}
                          {note.type === "appointment" && `New appointment scheduled.`}
                        </Link>
                      ) : (
                        <span className="text-muted">
                          {note.message || "Notification"}
                        </span>
                      )}

                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            placeholder="Search..."
            className="form-control"
            style={{ maxWidth: '180px' }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-outline-dark" onClick={handleSearch}>🔍</button>
          <button className="btn btn-light" onClick={() => setShowFilters(!showFilters)} ref={filterRef}>
            <img src={filterIcon} alt="filter" style={{ width: '20px' }} />
          </button>

          <button className="btn btn-outline-danger" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Filters Panel */}
      {showFilters && (
        <div
          className="position-absolute bg-white border shadow p-3 rounded"
          style={{ top: '60px', right: '150px', zIndex: 1000, width: '250px' }}
        >
          <h6>Filters</h6>
          <input type="text" placeholder="Location" className="form-control mb-2" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
          <select className="form-control mb-2" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Type</option>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>
          <input type="number" placeholder="Min Price" className="form-control mb-2" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          <input type="number" placeholder="Max Price" className="form-control mb-2" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <div className="d-flex gap-2">
            <button className="btn btn-primary w-100" onClick={() => { handleFilter(); setShowFilters(false); }}>Apply</button>
            <button className="btn btn-outline-secondary w-100" onClick={() => {
              setLocationFilter('');
              setTypeFilter('');
              setMinPrice('');
              setMaxPrice('');
              setProperties(originalProperties);
              setShowFilters(false);
            }}>Clear</button>
          </div>
        </div>
      )}

      {/* Add Property Button */}
      <div className="container-fluid py-4">
        {user?.role === 'owner' && (
          <div className="mb-3 text-end">
            <Link to="/add-property" className="btn btn-outline-primary fw-semibold">
              Add Property
            </Link>
          </div>
        )}

        <h4 className="fw-bold mb-3">Featured Properties</h4>
        <div className="row g-3">
          {properties.map((prop) => (
            <div className="col-sm-6 col-md-4" key={prop._id}>
              <div className="card h-100 shadow-sm">
                <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
                  <div className="ratio ratio-16x9 rounded-top" style={{
                    backgroundImage: `url(${prop.images?.[0] || ''})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }} />
                  <div className="card-body">
                    <h5 className="card-title">{prop.title}</h5>
                    <p className="card-text text-muted">
                      📍 {prop.location}<br />
                      💶 {prop.price} €<br />
                      🏷️ {prop.type}
                    </p>
                  </div>
                </Link>
                <div className="card-footer text-end bg-white border-0">
                  <button className="btn btn-sm btn-outline-warning" onClick={() => handleFavorite(prop._id)}>
                    {favorites.includes(prop._id) ? '★' : '☆'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Map View */}
        <div className="mt-5">
          <h5 className="mb-3 fw-bold">Map View</h5>
          <div className="card shadow-sm" style={{ height: '500px' }}>
            <MapContainer center={[37.9838, 23.7275]} zoom={11} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {properties.map((prop, idx) =>
                prop.latitude && prop.longitude ? (
                  <Marker key={idx} position={[prop.latitude, prop.longitude]}>
                    <Popup>
                      <strong>{prop.title}</strong><br />{prop.location}
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
