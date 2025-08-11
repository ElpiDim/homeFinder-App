import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import GoogleMapView from '../components/GoogleMapView';
import filterIcon from '../assets/filters.jpg';
import InterestsModal from '../components/InterestsModal';
import AppointmentModal from '../components/AppointmentModal';

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const dropdownRef = useRef(null);      // notifications
  const profileMenuRef = useRef(null);   // profile menu
  const filterButtonRef = useRef(null);  // filters button
  const filterPanelRef = useRef(null);   // filters panel

  const [selectedInterestId, setSelectedInterestId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const token = localStorage.getItem('token');

  const pageGradient = {
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  // ✅ Memoized for ESLint/deps
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    if (!user) return;

    axios.get('/api/properties').then((res) => {
      setProperties(res.data);
      setOriginalProperties(res.data);
    });

    axios
      .get('/api/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setFavorites(res.data.map((fav) => fav._id));
      });

    fetchNotifications();

    const endpoint =
      user.role === 'owner' ? '/api/appointments/owner' : '/api/appointments/tenant';

    axios
      .get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const confirmed = res.data.filter((appt) => appt.status === 'confirmed');
        setHasAppointments(confirmed.length > 0);
      })
      .catch((err) => console.error('Error fetching appointments:', err));
  }, [user, token, fetchNotifications]);

  // Poll notifications every 30s
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  // Close popovers on outside click + Esc
  useEffect(() => {
    const handleClickOutside = (e) => {
      const outsideNotifications =
        dropdownRef.current && !dropdownRef.current.contains(e.target);
      const outsideProfile =
        profileMenuRef.current && !profileMenuRef.current.contains(e.target);
      const outsideFilters =
        (!filterButtonRef.current || !filterButtonRef.current.contains(e.target)) &&
        (!filterPanelRef.current || !filterPanelRef.current.contains(e.target));

      if (outsideNotifications) setShowNotifications(false);
      if (outsideProfile) setShowProfileMenu(false);
      if (outsideFilters) setShowFilters(false);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleToggleNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);

    if (nextOpen) {
      const unread = notifications.filter((n) => !n.read);
      if (unread.length) {
        try {
          await Promise.all(
            unread.map((n) =>
              axios.patch(
                `/api/notifications/${n._id}/read`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              )
            )
          );
          const updated = notifications.map((n) => ({ ...n, read: true }));
          setNotifications(updated);
          setUnreadCount(0);
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    const filtered = originalProperties.filter((p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setProperties(filtered);
  };

  const handleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await axios.delete(`/api/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites(favorites.filter((id) => id !== propertyId));
      } else {
        await axios.post(
          '/api/favorites',
          { propertyId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        setFavorites([...favorites, propertyId]);
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const handleFilter = () => {
    const filtered = originalProperties.filter((p) => {
      const matchLocation = locationFilter
        ? (p.location || '').toLowerCase().includes(locationFilter.toLowerCase())
        : true;
      const matchType = typeFilter ? p.type === typeFilter : true;
      const matchMin = minPrice ? p.price >= parseFloat(minPrice) : true;
      const matchMax = maxPrice ? p.price <= parseFloat(maxPrice) : true;
      return matchLocation && matchType && matchMin && matchMax;
    });
    setProperties(filtered);
  };

  const imgUrl = (src) =>
    src
      ? src.startsWith('http')
        ? src
        : `http://localhost:5000${src}`
      : 'https://via.placeholder.com/400x225?text=No+Image';

  return (
    <div style={pageGradient}>
      {/* Navbar */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          position: 'relative',
          zIndex: 5000,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <svg width="24" height="24" fill="currentColor" viewBox="0 0 48 48">
            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z" />
          </svg>
          <h5 className="mb-0 fw-bold">insert app name here</h5>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          {hasAppointments && (
            <Link to="/appointments" className="text-dark text-decoration-none">
              Appointments
            </Link>
          )}
          <Link to="/favorites" className="text-dark text-decoration-none">
            Favorites
          </Link>

          {/* Profile Dropdown */}
          <div ref={profileMenuRef} className="position-relative">
            <button
              type="button"
              className="btn btn-outline-dark dropdown-toggle"
              onClick={() => setShowProfileMenu((v) => !v)}
            >
              Profile
            </button>
            {showProfileMenu && (
              <div
                className="position-absolute end-0 mt-2 bg-white border rounded shadow"
                style={{ minWidth: 200, zIndex: 6500 }}
              >
                <button
                  type="button"
                  className="dropdown-item w-100 text-start"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/profile');
                  }}
                >
                  Profile
                </button>
                {user?.role === 'owner' && (
                  <button
                    type="button"
                    className="dropdown-item w-100 text-start"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/my-properties');
                    }}
                  >
                    My Properties
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div ref={dropdownRef} className="position-relative">
            <button
              className="btn btn-link text-decoration-none text-dark p-0 position-relative"
              onClick={handleToggleNotifications}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.65rem' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div
                className="position-absolute bg-white border shadow p-3 rounded"
                style={{
                  top: '100%',
                  left: 0,
                  minWidth: '250px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 6000,
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Notifications</strong>
                  <button className="btn-close" onClick={() => setShowNotifications(false)} />
                </div>
                {notifications.length === 0 ? (
                  <p className="text-muted mb-0">No notifications</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {notifications.map((note, i) => (
                      <li key={i} className="border-bottom py-2 small">
                        {note.type === 'interest' ? (
                          <button
                            type="button"
                            className="btn btn-link text-decoration-none text-dark p-0"
                            onClick={() => {
                              setSelectedInterestId(note.referenceId);
                              setShowNotifications(false);
                            }}
                          >
                            {note.message ||
                              `${note.senderId?.name || 'Someone'} sent an interest.`}
                          </button>
                        ) : note.type === 'appointment' ? (
                          <button
                            type="button"
                            className="btn btn-link text-decoration-none text-dark p-0"
                            onClick={() => {
                              setSelectedAppointmentId(note.referenceId);
                              setShowNotifications(false);
                            }}
                          >
                            {note.message || 'New appointment scheduled.'}
                          </button>
                        ) : (
                          <Link
                            to={`/property/${note.referenceId}`}
                            className="text-decoration-none text-dark"
                            onClick={() => setShowNotifications(false)}
                          >
                            {note.message ||
                              (note.type === 'favorite' &&
                                `${note.senderId?.name || 'Someone'} added your property to favorites.`) ||
                              (note.type === 'property_removed' &&
                                'A property you interacted with was removed.') ||
                              (note.type === 'message' && 'New message received.')}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            className="form-control"
            style={{ maxWidth: '180px' }}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-outline-dark" onClick={handleSearch}>
            🔍
          </button>

          {/* Filters button */}
          <button
            ref={filterButtonRef}
            className="btn btn-light"
            onClick={() => setShowFilters((v) => !v)}
          >
            <img src={filterIcon} alt="filter" style={{ width: '20px' }} />
          </button>

          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Filters Panel (fixed so it never hides behind content) */}
      {showFilters && (
        <div
          ref={filterPanelRef}
          className="bg-white border shadow p-3 rounded"
          style={{
            position: 'fixed',
            top: 76,          // just under navbar
            right: 16,
            width: 280,
            zIndex: 6500,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h6>Filters</h6>
          <input
            type="text"
            placeholder="Location"
            className="form-control mb-2"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
          <select
            className="form-control mb-2"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Type</option>
            <option value="sale">Sale</option>
            <option value="rent">Rent</option>
          </select>
          <input
            type="number"
            placeholder="Min Price"
            className="form-control mb-2"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
          <input
            type="number"
            placeholder="Max Price"
            className="form-control mb-2"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary w-100"
              onClick={() => {
                handleFilter();
                setShowFilters(false);
              }}
            >
              Apply
            </button>
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setLocationFilter('');
                setTypeFilter('');
                setMinPrice('');
                setMaxPrice('');
                setProperties(originalProperties);
                setShowFilters(false);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container-fluid py-4">
        {user?.role === 'owner' && (
          <div className="mb-3 text-end">
            <Link to="/add-property" className="btn btn-outline-primary fw-semibold">
              Add Property
            </Link>
          </div>
        )}

        <h4 className="fw-bold mb-3">Featured Properties</h4>
        {properties.length === 0 ? (
          <p className="text-muted">No properties found.</p>
        ) : (
          <div className="row g-3">
            {properties.map((prop) => (
              <div className="col-sm-6 col-md-4" key={prop._id}>
                <div className="card h-100 shadow-sm">
                  <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
                    <div
                      className="ratio ratio-16x9 rounded-top"
                      style={{
                        backgroundImage: `url(${imgUrl(prop.images?.[0])})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div className="card-body">
                      <h5 className="card-title">{prop.title}</h5>
                      <p className="card-text text-muted mb-0">
                        📍 {prop.location}
                      </p>
                      <p className="card-text text-muted mb-0">
                        💶 {Number(prop.price).toLocaleString()} €
                      </p>
                      <p className="card-text text-muted">🏷️ {prop.type}</p>
                    </div>
                  </Link>
                  <div className="card-footer text-end bg-white border-0">
                    <button
                      className="btn btn-sm btn-outline-warning"
                      onClick={() => handleFavorite(prop._id)}
                    >
                      {favorites.includes(prop._id) ? '★' : '☆'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map View */}
        <div className="mt-5">
          <h5 className="mb-3 fw-bold">Map View</h5>
          <GoogleMapView properties={properties} height="500px" useClustering={false} />
        </div>
      </div>

      {selectedInterestId && (
        <InterestsModal
          interestId={selectedInterestId}
          onClose={() => setSelectedInterestId(null)}
        />
      )}

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
