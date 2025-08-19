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

/* ---------- εικόνες (local/ngrok) ---------- */
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
  // ΟΛΑ τα properties (για τον χάρτη)
  const [allProperties, setAllProperties] = useState([]);
  // ΜΟΝΟ της τρέχουσας σελίδας (για τη λίστα)
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
  const [minPrice, setMinPrice] = useState(''); // keep as string for smooth typing
  const [maxPrice, setMaxPrice] = useState(''); // keep as string for smooth typing
  const [minSqm, setMinSqm] = useState('');    // ✅ ΝΕΟ
  const [maxSqm, setMaxSqm] = useState('');    // ✅ ΝΕΟ
  // Τύπος προβολής από toggle ('' | 'sale' | 'rent')
  const [viewType, setViewType] = useState('');

  // geolocation
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // refs (dropdowns)
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);

  // refs για μέτρηση ύψους λίστας
  const leftColRef = useRef(null);
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

  // Φέρνει ΟΛΑ τα properties που ταιριάζουν στα φίλτρα (ο χάρτης τα δείχνει όλα)
  const fetchAllProperties = useCallback(async (overrides = {}) => {
    try {
      const minPriceParam = toNum(overrides.minPrice ?? minPrice);
      const maxPriceParam = toNum(overrides.maxPrice ?? maxPrice);
      const minSqmParam   = toNum(overrides.minSqm   ?? minSqm); // ✅ ΝΕΟ
      const maxSqmParam   = toNum(overrides.maxSqm   ?? maxSqm); // ✅ ΝΕΟ

      const params = {
        sort: 'relevance',
        q: overrides.q ?? (searchTerm || locationFilter || ''),
        type: overrides.type ?? (viewType || undefined),
        minPrice: minPriceParam,
        maxPrice: maxPriceParam,
        minSqm: minSqmParam,       // ✅ ΝΕΟ
        maxSqm: maxSqmParam,       // ✅ ΝΕΟ
        lat: overrides.lat ?? (userLat ?? undefined),
        lng: overrides.lng ?? (userLng ?? undefined),
        page: 1,
        limit: 9999, // Φέρε τα όλα — pagination κάνουμε client-side
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
  }, [searchTerm, locationFilter, viewType, minPrice, maxPrice, minSqm, maxSqm, userLat, userLng, page, limit]); // ✅ πρόσθεσα minSqm/maxSqm

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

    api
      .get('/favorites', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : [];
        const ids = arr.map((fav) => fav._id || fav.propertyId || fav.id).filter(Boolean);
        setFavorites(ids);
      })
      .catch(() => setFavorites([]));

    fetchNotifications();

    const endpoint =
      user.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
    api
      .get(endpoint, { headers: { Authorization: `Bearer ${token}` } })
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

  // close popovers on outside click + Esc
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

  /* ---------- measure LEFT column height & sync map height ---------- */
  useEffect(() => {
    const el = leftColRef.current;
    if (!el) return;

    const setH = () => {
      const h = el.scrollHeight;
      setMapContainerHeight(Math.max(h, 460));
    };

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

  // Κάθε αλλαγή φίλτρων/αναζήτησης → φέρνει ξανά ΟΛΟ το dataset & reset page 1
  const handleSearch = () => {
    setPage(1);
    fetchAllProperties({ q: searchTerm, page: 1 });
  };

  const handleFilter = () => {
    setPage(1);
    fetchAllProperties({
      q: searchTerm || locationFilter,
      page: 1,
      // min/max values (price/sqm) καθαρίζονται από το toNum μέσα στο fetchAllProperties
    });
  };

  const handleClearFilters = () => {
    setLocationFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinSqm('');   // ✅ ΝΕΟ
    setMaxSqm('');   // ✅ ΝΕΟ
    setSearchTerm('');
    setViewType(''); // reset σε All
    setPage(1);
    fetchAllProperties({
      q: '',
      type: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minSqm: undefined,  // ✅ ΝΕΟ
      maxSqm: undefined,  // ✅ ΝΕΟ
      page: 1
    });
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

          {/* Notifications (button) */}
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
          <button className="btn btn-outline-dark" onClick={handleSearch}>🔍</button>

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

      {/* Filters Panel (type ελέγχεται από το toggle) */}
      {showFilters && (
        <div
          ref={filterPanelRef}
          className="bg-white border shadow p-3 rounded"
          style={{ position: 'fixed', top: 76, right: 16, width: 300, zIndex: 6500 }}
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

          {/* number-as-text για smooth typing */}
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

          {/* ✅ Τετραγωνικά μέτρα */}
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
            className="form-control mb-2"
            value={maxSqm}
            onChange={(e) => setMaxSqm(e.target.value)}
          />

          <div className="d-flex gap-2 pt-1">
            <button
              className="btn btn-primary w-100"
              onClick={() => { handleFilter(); setShowFilters(false); }}
            >
              Apply
            </button>
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => { handleClearFilters(); setShowFilters(false); }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

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

                {/* Pagination */}
                <div className="mt-2">
                  <nav className="mt-3">
                    <ul className="pagination justify-content-center">
                      <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={goPrev}>Prev</button>
                      </li>

                      {(() => {
                        const windowSize = 5;
                        const start = Math.max(1, page - Math.floor(windowSize / 2));
                        const end = Math.min(totalPages, start + windowSize - 1);
                        const buttons = [];
                        if (start > 1) {
                          buttons.push(
                            <li key="first" className="page-item">
                              <button className="page-link" onClick={() => goPage(1)}>1</button>
                            </li>
                          );
                          if (start > 2) {
                            buttons.push(
                              <li key="ellipsis-left" className="page-item disabled">
                                <span className="page-link">…</span>
                              </li>
                            );
                          }
                        }
                        for (let p = start; p <= end; p++) {
                          buttons.push(
                            <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                              <button className="page-link" onClick={() => goPage(p)}>{p}</button>
                            </li>
                          );
                        }
                        if (end < totalPages) {
                          if (end < totalPages - 1) {
                            buttons.push(
                              <li key="ellipsis-right" className="page-item disabled">
                                <span className="page-link">…</span>
                              </li>
                            );
                          }
                          buttons.push(
                            <li key="last" className="page-item">
                              <button className="page-link" onClick={() => goPage(totalPages)}>{totalPages}</button>
                            </li>
                          );
                        }
                        return buttons;
                      })()}

                      <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={goNext}>Next</button>
                      </li>
                    </ul>
                    <p className="text-center text-muted small mb-0">
                      Page {page} of {totalPages}
                    </p>
                  </nav>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Sticky Map — δείχνει ΟΛΑ τα properties */}
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
