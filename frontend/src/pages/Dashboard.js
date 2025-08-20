// src/pages/Dashboard.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import GoogleMapView from '../components/GoogleMapView';
import filterIcon from '../assets/filters.jpg';
import InterestsModal from '../components/InterestsModal';
import AppointmentModal from '../components/AppointmentModal';

/* ---------- helpers (notifications) ---------- */
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

/* ---------- images (local/ngrok) ---------- */
const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');
function normalizeUploadPath(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const clean = src.replace(/^\/+/, '');
  return clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
}

function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  /* ---------- state ---------- */
  const [allProperties, setAllProperties] = useState([]);
  const [properties, setProperties] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedInterestId, setSelectedInterestId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // filters
  const [locationFilter, setLocationFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minSqm, setMinSqm] = useState('');
  const [maxSqm, setMaxSqm] = useState('');
  const [viewType, setViewType] = useState(''); // '' | 'sale' | 'rent'

  // geolocation
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // refs
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);
  const filterButtonRef = useRef(null); // κουμπί φίλτρων
  const filterPanelRef = useRef(null);  // panel φίλτρων
  const leftColRef = useRef(null);
  const stickyWrapRef = useRef(null);

  const [mapContainerHeight, setMapContainerHeight] = useState(520);

  const token = localStorage.getItem('token');

  /* ---------- utils ---------- */
  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 22%, #fce7f3 50%, #ffe4e6 72%, #fff7ed 100%)',
  }), []);

  const imgUrl = (src) => {
    if (!src) return 'https://via.placeholder.com/400x225?text=No+Image';
    if (src.startsWith('http')) return src;
    const rel = normalizeUploadPath(src);
    return `${API_ORIGIN}${rel}`;
  };

  const totalPages = useMemo(() => meta?.totalPages || 1, [meta]);

  // κρατά μόνο ψηφία και επιστρέφει Number ή undefined
  const toNum = (v) => {
    const s = String(v ?? '').replace(/\D+/g, '');
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };

  /* ---------- actions ---------- */
  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const handleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await api.delete(`/favorites/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await api.post(
          '/favorites',
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

  // fetch all for map + client-side pagination for list
  const fetchAllProperties = useCallback(async (overrides = {}) => {
    try {
      const minPriceParam = toNum(overrides.minPrice ?? minPrice);
      const maxPriceParam = toNum(overrides.maxPrice ?? maxPrice);
      const minSqmParam   = toNum(overrides.minSqm   ?? minSqm);
      const maxSqmParam   = toNum(overrides.maxSqm   ?? maxSqm);

      const params = {
        sort: 'relevance',
        q: overrides.q ?? (searchTerm || locationFilter || ''),
        type: overrides.type ?? (viewType || undefined),
        minPrice: minPriceParam,
        maxPrice: maxPriceParam,
        minSqm: minSqmParam,
        maxSqm: maxSqmParam,
        lat: overrides.lat ?? (userLat ?? undefined),
        lng: overrides.lng ?? (userLng ?? undefined),
        page: 1,
        limit: 9999,
      };

      const res = await api.get('/properties', { params });
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);

      setAllProperties(items);

      // client-side pagination
      const total = items.length;
      const totalPagesCalc = Math.max(1, Math.ceil(total / limit));

      const currentPage = overrides.page ?? page;
      const safePage = Math.min(Math.max(1, currentPage), totalPagesCalc);
      const start = (safePage - 1) * limit;
      const paginated = items.slice(start, start + limit);

      setPage(safePage);
      setProperties(paginated);
      setMeta({ total, totalPages: totalPagesCalc, limit, page: safePage });
    } catch (err) {
      console.error('Error fetching properties:', err);
      setAllProperties([]);
      setProperties([]);
      setMeta({ total: 0, totalPages: 1, limit, page: 1 });
    }
  }, [searchTerm, locationFilter, viewType, minPrice, maxPrice, minSqm, maxSqm, userLat, userLng, page, limit]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications', {
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

  /* ---------- effects ---------- */
  useEffect(() => {
    if (!user) return;

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

    fetchAllProperties({ page: 1 });

    api.get('/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : [];
        const ids = arr.map((fav) => fav._id || fav.propertyId || fav.id).filter(Boolean);
        setFavorites(ids);
      })
      .catch(() => setFavorites([]));

    fetchNotifications();

    const endpoint = user.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
    api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const appts = Array.isArray(res.data) ? res.data : [];
        const confirmed = appts.filter((appt) => appt.status === 'confirmed');
        setHasAppointments(confirmed.length > 0);
      })
      .catch(() => setHasAppointments(false));
  }, [user, token, fetchAllProperties, fetchNotifications]);

  // Όταν αλλάξει page → client-side σελιδοποίηση
  useEffect(() => {
    const total = allProperties.length;
    const totalPagesCalc = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPagesCalc);
    const start = (safePage - 1) * limit;
    setProperties(allProperties.slice(start, start + limit));
    setMeta({ total, totalPages: totalPagesCalc, limit, page: safePage });
  }, [page, limit, allProperties]);

  // notifications polling
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  // close popovers on outside click + Esc (notifications, profile, filters)
  useEffect(() => {
    const handleClickOutside = (e) => {
      const outsideNotifications = dropdownRef.current && !dropdownRef.current.contains(e.target);
      const outsideProfile = profileMenuRef.current && !profileMenuRef.current.contains(e.target);
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

  /* ---------- sync map height with list ---------- */
useEffect(() => {
  const el = leftColRef.current;
  if (!el) return;

  const setH = () => setMapContainerHeight(Math.max(el.scrollHeight, 460));
  setH();

  const ro = new ResizeObserver(setH);
  ro.observe(el);
  window.addEventListener('resize', setH);

  return () => {
    ro.disconnect();
    window.removeEventListener('resize', setH);
  };
}, [properties, page, limit, totalPages]);

  /* ---------- handlers ---------- */
  const handleToggleNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (nextOpen) {
      const unread = notifications.filter((n) => !n.read);
      if (unread.length) {
        try {
          await Promise.all(
            unread.map((n) =>
              api.patch(`/notifications/${n._id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              })
            )
          );
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setUnreadCount(0);
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    }
  };

  const handleNotificationClick = (note) => {
    if (!note) return;
    if (note.type === 'appointment') {
      setSelectedAppointmentId(note.referenceId);
    } else if (
      note.type === 'interest' ||
      note.type === 'interest_accepted' ||
      note.type === 'interest_rejected'
    ) {
      setSelectedInterestId(note.referenceId);
    } else if (note.referenceId) {
      navigate(`/property/${note.referenceId}`);
    }
    setShowNotifications(false);
  };

  const handleSearch = () => {
    setPage(1);
    fetchAllProperties({ q: searchTerm, page: 1 });
  };

  const handleFilter = () => {
    setPage(1);
    fetchAllProperties({
      q: searchTerm || locationFilter,
      page: 1,
      // min/max values parse στο fetchAllProperties μέσω toNum
    });
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');
    setMaxSqm('');
    setSearchTerm('');
    setViewType('');
    setPage(1);
    fetchAllProperties({
      q: '',
      type: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minSqm: undefined,
      maxSqm: undefined,
      page: 1
    });
    setShowFilters(false);
  };

  // pagination helpers
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const goPrev = () => { if (!canPrev) return; setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goNext = () => { if (!canNext) return; setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPage = (p) => { if (p === page) return; setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const renderPager = () => {
    if (!properties || properties.length === 0) return null;
    if (totalPages && totalPages > 1) {
      const windowSize = 5;
      const start = Math.max(1, page - Math.floor(windowSize / 2));
      const end = Math.min(totalPages, start + windowSize - 1);
      const pages = [];
      for (let i = start; i <= end; i++) pages.push(i);

      return (
        <nav className="mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${!canPrev ? 'disabled' : ''}`}>
              <button className="page-link" onClick={goPrev}>Prev</button>
            </li>
            {start > 1 && (
              <>
                <li className="page-item"><button className="page-link" onClick={() => goPage(1)}>1</button></li>
                {start > 2 && <li className="page-item disabled"><span className="page-link">…</span></li>}
              </>
            )}
            {pages.map((p) => (
              <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                <button className="page-link" onClick={() => goPage(p)}>{p}</button>
              </li>
            ))}
            {end < totalPages && (
              <>
                {end < totalPages - 1 && <li className="page-item disabled"><span className="page-link">…</span></li>}
                <li className="page-item"><button className="page-link" onClick={() => goPage(totalPages)}>{totalPages}</button></li>
              </>
            )}
            <li className={`page-item ${!canNext ? 'disabled' : ''}`}>
              <button className="page-link" onClick={goNext}>Next</button>
            </li>
          </ul>
          <p className="text-center text-muted small mb-0">
            Page {page} of {totalPages}
          </p>
        </nav>
      );
    }
    return null;
  };

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
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          <Link to="/appointments" className="text-dark text-decoration-none">Appointments</Link>
          <Link to="/favorites" className="text-dark text-decoration-none">Favorites</Link>

          {/* Notifications */}
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
                className="position-absolute end-0 mt-2 bg-white border rounded shadow"
                style={{ width: 320, zIndex: 6500 }}
              >
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div className="p-3 text-center text-muted">No notifications.</div>
                  ) : (
                    <ul className="list-group list-group-flush mb-0">
                      {notifications.map((note) => (
                        <li
                          key={note._id}
                          className="list-group-item list-group-item-action d-flex gap-2"
                          style={{ cursor: 'pointer', background: note.read ? '#fff' : '#f8fafc' }}
                          onClick={() => handleNotificationClick(note)}
                        >
                          <span style={{ fontSize: '1.2rem' }}>{iconForType(note.type)}</span>
                          <span className="small flex-grow-1">{titleForNote(note)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border-top text-center">
                  <Link
                    to="/notifications"
                    className="d-block py-2 small"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all
                  </Link>
                </div>
              </div>
            )}
          </div>

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
                  onClick={() => { setShowProfileMenu(false); navigate('/profile'); }}
                >
                  Profile
                </button>
                {user?.role === 'owner' && (
                  <button
                    type="button"
                    className="dropdown-item w-100 text-start"
                    onClick={() => { setShowProfileMenu(false); navigate('/my-properties'); }}
                  >
                    My Properties
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Logout last */}
          <button className="btn btn-outline-danger" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Logo box above search */}
      <div className="container mt-4 mb-2">
        <div className="d-flex justify-content-center">
          <div
            className="px-5 py-3 rounded-4 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #f9fafb, #f1f5f9)",
              border: "1px solid #e5e7eb"
            }}
          >
            <h1
              className="mb-1 d-flex align-items-center gap-2"
              style={{
                fontFamily: "'Poppins','Fredoka',sans-serif",
                fontSize: "2.6rem",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "lowercase",
                background: "linear-gradient(90deg, #2563eb, #9333ea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              <span role="img" aria-label="home">🏠</span> homie
            </h1>
          </div>
        </div>
      </div>
      
      {/* Central Top Search Bar */}
      <div className="container" style={{ marginTop: 35 }}>
        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
          className="d-flex justify-content-center"
        >
          <div
            className="input-group shadow-sm"
            style={{
              maxWidth: 760,
              width: '100%',
              borderRadius: 50,
              overflow: 'visible',
            }}
          >
            {/* 🔍 Icon */}
            <span className="input-group-text bg-white border-0 px-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 21l-4.2-4.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>

            {/* 🔎 Input */}
            <input
              type="text"
              className="form-control border-0"
              style={{ fontSize: 15, paddingTop: 10, paddingBottom: 10 }}
              placeholder="Search by city, area or address…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />

            {/* ⚙️ Filters (anchored panel) */}
            <div className="position-relative">
              <button
                type="button"
                ref={filterButtonRef}
                className="btn btn-light border-start px-3"
                onClick={() => setShowFilters((v) => !v)}
                title="Filters"
              >
                <img src={filterIcon} alt="Filters" style={{ width: 16 }} />
              </button>

              {showFilters && (
                <div
                  ref={filterPanelRef}
                  className="bg-white border shadow p-3 rounded"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    width: 320,
                    zIndex: 6500,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h6 className="mb-2">Filters</h6>

                  <input
                    type="text"
                    placeholder="Location"
                    className="form-control mb-2"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min Price"
                    className="form-control mb-2"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max Price"
                    className="form-control mb-2"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Min Square meters"
                    className="form-control mb-2"
                    value={minSqm}
                    onChange={(e) => setMinSqm(e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Max Square meters"
                    className="form-control mb-3"
                    value={maxSqm}
                    onChange={(e) => setMaxSqm(e.target.value)}
                  />

                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-primary w-100" onClick={handleFilter}>
                      Apply
                    </button>
                    <button type="button" className="btn btn-outline-secondary w-100" onClick={handleClearFilters}>
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 🔵 Search Button */}
            <button
              type="submit"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white',
                fontWeight: 600,
                fontSize: 14,
                padding: '0 20px',
                borderRadius: 0,
              }}
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {/* CONTENT: list (left) + sticky map (right) */}
      <div className="container-fluid py-4">
        {user?.role === 'owner' && (
          <div className="mb-3 text-end">
            <Link to="/add-property" className="btn btn-outline-primary fw-semibold">Add Property</Link>
          </div>
        )}

        <div className="row g-4">
          {/* LEFT: Properties list */}
          <div className="col-lg-7" ref={leftColRef}>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h4 className="fw-bold mb-0">Featured Properties</h4>

              {/* Toggle: All / Sale / Rent */}
              <div className="btn-group" role="group" aria-label="type toggle">
                <button
                  className={`btn ${viewType === '' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                  onClick={() => { setViewType(''); setPage(1); fetchAllProperties({ type: undefined, page: 1 }); }}
                >
                  All
                </button>
                <button
                  className={`btn ${viewType === 'sale' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => { setViewType('sale'); setPage(1); fetchAllProperties({ type: 'sale', page: 1 }); }}
                >
                  Sale
                </button>
                <button
                  className={`btn ${viewType === 'rent' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => { setViewType('rent'); setPage(1); fetchAllProperties({ type: 'rent', page: 1 }); }}
                >
                  Rent
                </button>
              </div>
            </div>

            {!Array.isArray(properties) || properties.length === 0 ? (
              <p className="text-muted">No properties found.</p>
            ) : (
              <>
                <div className="row g-3">
                  {properties.map((prop) => (
                    <div className="col-sm-6" key={prop._id}>
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

                <div className="mt-2">
                  {renderPager()}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Sticky Map */}
          <div className="col-lg-5">
            <div className="position-sticky" style={{ top: 88 }}>
              <div className="card border-0 shadow-sm" style={{ height: mapContainerHeight }}>
                <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
                  <h5 className="mb-0 fw-bold">Map</h5>
                </div>
                <GoogleMapView
                  properties={allProperties}
                  height="calc(100% - 48px)"
                  useClustering={false}
                  navigateOnMarkerClick
                />
              </div>
            </div>
          </div>
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
