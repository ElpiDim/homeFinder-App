import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import GoogleMapView from '../components/GoogleMapView';
import filterIcon from '../assets/filters.jpg';
import InterestsModal from '../components/InterestsModal';
import AppointmentModal from '../components/AppointmentModal';

// --- helpers for the notifications UI (outside component) ---
const iconForType = (t) => {
  switch (t) {
    case 'appointment': return '📅';
    case 'interest': return '👋';
    case 'favorite': return '⭐';
    case 'interest_accepted': return '✅';
    case 'interest_rejected': return '❌';
    case 'property_removed': return '🏠❌';
    case 'message': return '💬';
    default: return '🔔';
  }
};

const titleForNote = (n) => {
  if (n?.message) return n.message;
  switch (n?.type) {
    case 'appointment': return 'You have new appointment options from the property owner.';
    case 'interest':
    case 'interest_accepted':
    case 'interest_rejected':
      return n.message || `${n?.senderId?.name || 'Someone'} sent an interest.`;
    case 'favorite': return `${n?.senderId?.name || 'Someone'} added your property to favorites.`;
    case 'property_removed': return 'A property you interacted with was removed.';
    case 'message': return 'New message received.';
    default: return 'Notification';
  }
};

const timeAgo = (d) => {
  if (!d) return '';
  const diff = Math.max(0, Date.now() - new Date(d).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dys = Math.floor(h / 24);
  return `${dys}d ago`;
};

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);        // always array
  const [meta, setMeta] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);          // array of propertyIds
  const [notifications, setNotifications] = useState([]);  // always array
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);

  const [selectedInterestId, setSelectedInterestId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // filters (server-side)
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // geolocation
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  const token = localStorage.getItem('token');

  const handleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await axios.delete(`/api/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
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
        setFavorites((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

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

  // ---- fetch properties (server-side relevance) ----
  const fetchProperties = useCallback(async (overrides = {}) => {
    try {
      const params = {
        sort: 'relevance',
        q: overrides.q ?? (searchTerm || locationFilter || ''),
        type: overrides.type ?? (typeFilter || undefined),
        minPrice: overrides.minPrice ?? (minPrice || undefined),
        maxPrice: overrides.maxPrice ?? (maxPrice || undefined),
        lat: overrides.lat ?? (userLat ?? undefined),
        lng: overrides.lng ?? (userLng ?? undefined),
        page: overrides.page ?? 1,
        limit: overrides.limit ?? 24,
      };
      const res = await axios.get('/api/properties', { params });

      // normalize array/object response
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      const metaObj = Array.isArray(res.data) ? null : (res.data?.meta || null);

      setProperties(items);
      setMeta(metaObj);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setProperties([]); // fail-safe
      setMeta(null);
    }
  }, [searchTerm, locationFilter, typeFilter, minPrice, maxPrice, userLat, userLng]);

  // ---- notifications ----
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [token]);

  // ---- initial load ----
  useEffect(() => {
    if (!user) return;

    // geolocation (non-blocking)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
      );
    }

    fetchProperties();

    axios
      .get('/api/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : [];
        // map to property ids safely
        const ids = arr.map((fav) => fav._id || fav.propertyId || fav.id).filter(Boolean);
        setFavorites(ids);
      })
      .catch(() => setFavorites([]));

    fetchNotifications();

    const endpoint =
      user.role === 'owner' ? '/api/appointments/owner' : '/api/appointments/tenant';

    axios
      .get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const appts = Array.isArray(res.data) ? res.data : [];
        const confirmed = appts.filter((appt) => appt.status === 'confirmed');
        setHasAppointments(confirmed.length > 0);
      })
      .catch((err) => {
        console.error('Error fetching appointments:', err);
        setHasAppointments(false);
      });
  }, [user, token, fetchProperties, fetchNotifications]);

  // re-fetch when geolocation arrives
  useEffect(() => {
    if (user && (userLat !== null || userLng !== null)) {
      fetchProperties();
    }
  }, [user, userLat, userLng, fetchProperties]);

  // polling notifications
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

  // Search now calls the server (relevance + q)
  const handleSearch = () => {
    fetchProperties({ q: searchTerm });
  };

  // Filters now call the server
  const handleFilter = () => {
    fetchProperties({
      q: searchTerm || locationFilter,
      type: typeFilter || undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setTypeFilter('');
    setMinPrice('');
    setMaxPrice('');
    fetchProperties({
      q: searchTerm || '',
      type: undefined,
      minPrice: undefined,
      maxPrice: undefined,
    });
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
          {/* πάντα ορατό Appointments link */}
          <Link to="/appointments" className="text-dark text-decoration-none">
            Appointments
          </Link>

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
                className="position-absolute"
                style={{ top: '100%', right: 0, zIndex: 6000, width: 380, maxWidth: '86vw' }}
              >
                <div className="card shadow-sm" style={{ fontSize: '0.95rem' }}>
                  <div className="card-header d-flex align-items-center" style={{ fontWeight: 600 }}>
                    <span>Notifications</span>
                    <div className="ms-auto d-flex align-items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={async () => {
                            const unread = notifications.filter(n => !n.read);
                            try {
                              await Promise.all(
                                unread.map(n =>
                                  axios.patch(`/api/notifications/${n._id}/read`, {}, {
                                    headers: { Authorization: `Bearer ${token}` }
                                  })
                                )
                              );
                              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                              setUnreadCount(0);
                            } catch (e) {
                              console.error('Mark all read failed', e);
                            }
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                      <button className="btn-close" onClick={() => setShowNotifications(false)} />
                    </div>
                  </div>

                  <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <ul className="list-group list-group-flush">
                      {(() => {
                        const seen = new Set();
                        const list = notifications.filter(n => {
                          const id = n?._id || `${n?.type}-${n?.referenceId}-${n?.createdAt || ''}`;
                          if (!id) return false;
                          if (seen.has(id)) return false;
                          seen.add(id);
                          return true;
                        });

                        if (list.length === 0) {
                          return (
                            <li className="list-group-item text-center text-muted py-4">
                              No notifications
                            </li>
                          );
                        }

                        return list.map(note => {
                          const isUnread = !note.read;
                          const go = async () => {
                            if (isUnread && note._id) {
                              setNotifications(prev => prev.map(n => n._id === note._id ? { ...n, read: true } : n));
                              setUnreadCount(c => Math.max(0, c - 1));
                              try {
                                await axios.patch(`/api/notifications/${note._id}/read`, {}, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                              } catch (e) {
                                setNotifications(prev => prev.map(n => n._id === note._id ? { ...n, read: false } : n));
                                setUnreadCount(c => c + 1);
                              }
                            }

                            if (['interest', 'interest_accepted', 'interest_rejected'].includes(note.type)) {
                              setSelectedInterestId(note.referenceId);
                              setShowNotifications(false);
                            } else if (note.type === 'appointment') {
                              setSelectedAppointmentId(note.referenceId);
                              setShowNotifications(false);
                            } else if (note.referenceId) {
                              setShowNotifications(false);
                              navigate(`/property/${note.referenceId}`);
                            }
                          };

                          return (
                            <li
                              key={note._id || `${note.type}-${note.referenceId}-${note.createdAt}`}
                              className="list-group-item py-3 px-3"
                              onClick={go}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex align-items-start">
                                <div
                                  className="me-3 d-flex align-items-center justify-content-center"
                                  style={{
                                    width: 36, height: 36, borderRadius: 12,
                                    background: 'rgba(13,110,253,.08)', fontSize: 18, flex: '0 0 36px'
                                  }}
                                >
                                  {iconForType(note.type)}
                                </div>

                                <div className="flex-grow-1">
                                  <div className="d-flex">
                                    <div style={{ lineHeight: 1.35, color: '#212529' }}>
                                      {titleForNote(note)}
                                    </div>
                                    {isUnread && (
                                      <span
                                        className="ms-auto mt-1"
                                        style={{
                                          width: 8, height: 8, borderRadius: 9999,
                                          background: '#dc3545', display: 'inline-block', flex: '0 0 auto'
                                        }}
                                        aria-label="unread"
                                      />
                                    )}
                                  </div>
                                  <div style={{ color: '#6c757d', marginTop: 4 }}>
                                    {timeAgo(note.createdAt)}
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        });
                      })()}
                    </ul>
                  </div>

                  <div className="card-footer bg-light text-center">
                    <button
                      className="btn btn-link text-decoration-none"
                      onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
                    >
                      View all
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search..."
            className="form-control"
            style={{ maxWidth: '180px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

      {/* Filters Panel */}
      {showFilters && (
        <div
          ref={filterPanelRef}
          className="bg-white border shadow p-3 rounded"
          style={{
            position: 'fixed',
            top: 76,
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
                handleClearFilters();
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
        {!Array.isArray(properties) || properties.length === 0 ? (
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
                      <p className="card-text text-muted mb-0">📍 {prop.location}</p>
                      {prop.price != null && (
                        <p className="card-text text-muted mb-0">
                          💶 {Number(prop.price).toLocaleString()} €
                        </p>
                      )}
                      {prop.type && <p className="card-text text-muted">🏷️ {prop.type}</p>}
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
          <GoogleMapView
            properties={Array.isArray(properties) ? properties : []}
            height="500px"
            useClustering={false}
            navigateOnMarkerClick
          />
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
