// src/pages/Dashboard.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import AppointmentModal from '../components/AppointmentModal';
import OwnerAppointmentsCalendar from '../components/OwnerAppointmentsCalendar';
import PropertyCard from '../components/propertyCard';
import Logo from '../components/Logo';
import { useMessages } from '../context/MessageContext';

/* ---------- helpers (notifications) ---------- */
const iconForType = (t) => {
  switch (t) {
    case 'appointment': return '📅';
    case 'favorite': return '⭐';
    case 'property_removed': return '🏠❌';
    case 'message': return '💬';
    default: return '🔔';
  }
};
const titleForNote = (n) => {
  if (n?.message) return n.message;
  switch (n?.type) {
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadChats } = useMessages();

  /* ---------- state ---------- */
  const [allProperties, setAllProperties] = useState([]);
  const [properties, setProperties] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const [ownerAppointments, setOwnerAppointments] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // geolocation (kept for parity; not shown on UI)
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // owner stats (optional from backend)
  const [ownerStats, setOwnerStats] = useState(null);

  // refs
  const dropdownRef = useRef(null);

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : '/default-avatar.jpg';

  /* ---------- utils ---------- */
  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #f3e5f5 0%, #ede7f6 33%, #e1bee7 66%, #f8f1fa 100%)',
  }), []);

  const imgUrl = (src) => {
    if (!src) return 'https://via.placeholder.com/400x225?text=No+Image';
    if (src.startsWith('http')) return src;
    const rel = normalizeUploadPath(src);
    return `${API_ORIGIN}${rel}`;
  };

  const totalPages = useMemo(() => meta?.totalPages || 1, [meta]);

  const preferredDealType = useMemo(() => {
    if (user?.role !== 'client') return undefined;
    return user?.preferences?.dealType === 'sale' ? 'sale' : 'rent';
  }, [user]);

  /* ---------- actions ---------- */
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleFavorite = async (propertyId) => {
    try {
      if (favorites.includes(propertyId)) {
        await api.delete(`/favorites/${propertyId}`);
        setFavorites((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await api.post('/favorites', { propertyId }, { headers: { 'Content-Type': 'application/json' } });
        setFavorites((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error('Error updating favorite:', err);
    }
  };

  const fetchAllProperties = useCallback(
    async (overrides = {}) => {
      try {
        const isOwner = user?.role === 'owner';
        const effectiveType =
          overrides.type !== undefined
            ? overrides.type
            : preferredDealType || undefined;

        const params = isOwner
          ? { includeStats: 1 }
          : {
              sort: 'relevance',
              type: effectiveType,
              lat: overrides.lat ?? (userLat ?? undefined),
              lng: overrides.lng ?? (userLng ?? undefined),
              page: 1,
              limit: 9999,
            };

        const endpoint = isOwner ? '/properties/mine' : '/properties';
        const res = await api.get(endpoint, { params });

        const items = Array.isArray(res.data) ? res.data : res.data?.items || [];

        setAllProperties(items);

        // client-side pagination
        const total = items.length;
        const totalPagesCalc = Math.max(1, Math.ceil(total / limit));

        const currentPage = overrides.page ?? 1;
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
    },
    [preferredDealType, userLat, userLng, user?.role, limit]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.readAt && !n.read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

  const handleToggleNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (nextOpen) {
      const unread = notifications.filter((n) => !n.readAt && !n.read);
      if (unread.length) {
        try {
          await Promise.all(
            unread.map((n) => api.patch(`/notifications/${n._id}/read`))
          );
          const now = new Date().toISOString();
          setNotifications((prev) => prev.map((n) =>
            unread.some((u) => u._id === n._id) ? { ...n, read: true, readAt: now } : n
          ));
          setUnreadCount(0);
        } catch (err) {
          console.error('Failed to mark notifications as read:', err);
        }
      }
    }
  };

  // fetch owner stats
  const fetchOwnerStats = useCallback(async () => {
    if (user?.role !== 'owner') return;
    try {
      const res = await api.get('/owners/stats');
      setOwnerStats(res.data);
    } catch {
      setOwnerStats(null);
    }
  }, [user?.role]);

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
    fetchOwnerStats();

    // Load favorites → map to property IDs
    api.get('/favorites')
      .then((res) => {
        const arr = Array.isArray(res.data) ? res.data : [];
        const ids = arr
          .map((fav) => {
            const pid = (fav.propertyId && typeof fav.propertyId === 'object')
              ? fav.propertyId._id
              : fav.propertyId;
            return pid || null;
          })
          .filter(Boolean);
        setFavorites(ids);
      })
      .catch(() => setFavorites([]));

    fetchNotifications();

    const endpoint = user.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
    api.get(endpoint)
      .then((res) => {
        const appts = Array.isArray(res.data) ? res.data : [];
        const hasActiveAppts = appts.some((appt) => {
          const status = (appt.status || '').toLowerCase();
          return status === 'pending' || status === 'confirmed';
        });
        setHasAppointments(hasActiveAppts);

        if (user.role === 'owner') {
          setOwnerAppointments(appts);
        }
      })
      .catch(() => {
        setHasAppointments(false);
        if (user.role === 'owner') {
          setOwnerAppointments([]);
        }
      });
  }, [user, fetchAllProperties, fetchNotifications, fetchOwnerStats]);

  // client-side pagination when page changes
  useEffect(() => {
    const total = allProperties.length;
    const totalPagesCalc = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPagesCalc);
    const start = (safePage - 1) * limit;
    setProperties(allProperties.slice(start, start + limit));
    setMeta({ total, totalPages: totalPagesCalc, limit, page: safePage });
  }, [page, limit, allProperties]);

  // polling
  useEffect(() => {
    if (!user) return;
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);
  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && setShowNotifications(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---------- derived owner stats (FRACTIONS) ---------- */
  const totalListings = useMemo(
    () => (user?.role === 'owner' ? allProperties.length : 0),
    [user?.role, allProperties]
  );

  const likedListings = useMemo(
    () => (user?.role === 'owner'
      ? allProperties.filter(p => Number(p.favoritesCount || 0) > 0).length
      : 0),
    [user?.role, allProperties]
  );

  // --- ΕΔΩ ΕΙΝΑΙ Η ΑΛΛΑΓΗ ΓΙΑ TOTAL VIEWS ---
  // Αντί να μετράμε πόσα σπίτια έχουν >0 views, προσθέτουμε τα views από όλα τα σπίτια
  const totalViews = useMemo(
    () => (user?.role === 'owner'
      ? allProperties.reduce((sum, p) => sum + (p.seenBy ? p.seenBy.length : 0), 0)
      : 0),
    [user?.role, allProperties]
  );
  // ------------------------------------------

  const rentedListings = useMemo(
    () => (user?.role === 'owner'
      ? allProperties.filter(p => (p.status || '').toLowerCase() === 'rented').length
      : 0),
    [user?.role, allProperties]
  );

  /* ---------- Donut (SVG, fraction-based) ---------- */
  const Donut = ({ value = 0, max = 0, label = 'Label', icon = '💚' }) => {
    // Αν δεν υπάρχει max (ή max=0 και value>0), δείχνουμε full circle
    const isTotal = max === null || max === undefined;
    const pct = isTotal 
      ? 100 
      : (max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
      
    const size = 128;
    const stroke = 10;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = (pct / 100) * c;

    return (
      <div className="p-3 p-md-4 rounded-4 shadow-sm h-100 text-center"
           style={{ background: '#ffffffcc', border: '1px solid #eef2f4' }}>
        <div className="position-relative mx-auto" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* trail */}
            <circle
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke="#e9f7ef"
              strokeWidth={stroke}
            />
            {/* progress */}
            <circle
              cx={size/2} cy={size/2} r={r}
              fill="none"
              stroke={label === 'Total Views' ? '#0dcaf0' : "#a020f0"} // Blue for Views, Purple for others
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          </svg>

          {/* center content */}
          <div
            className="position-absolute d-flex flex-column align-items-center justify-content-center"
            style={{ inset: 0 }}
          >
            <div style={{ fontSize: 20 }}>{icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{value}</div>
            {/* Κρύβουμε το "of X" αν δεν υπάρχει max */}
            {!isTotal && <div className="text-muted" style={{ fontSize: 12 }}>of {max}</div>}
          </div>
        </div>
        <div className="mt-2 fw-semibold">{label}</div>
      </div>
    );
  };

  /* ---------- handlers ---------- */
  const handleNotificationClick = (note) => {
    if (!note) return;
    if (note.type === 'appointment') {
      setSelectedAppointmentId(note.referenceId);
    } else if (note.referenceId) {
      navigate(`/property/${note.referenceId}`);
    }
    setShowNotifications(false);
  };

  // pagination helpers
  const totalPagesNum = totalPages;
  const canPrev = page > 1;
  const canNext = page < totalPagesNum;
  const goPrev = () => { if (!canPrev) return; setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goNext = () => { if (!canNext) return; setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goPage = (p) => { if (p === page) return; setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div style={pageGradient}>
      {/* Navbar */}
     {/* Navbar - Purple with White Text */}
      <nav
        className="navbar navbar-expand-lg px-4 py-3 shadow-sm"
        style={{
          background: '#6f42c1', // <--- ΑΛΛΑΓΗ 1: Μωβ Χρώμα (Bootstrap purple)
          // Εναλλακτικά για gradient: background: 'linear-gradient(135deg, #6f42c1, #8e44ad)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          position: 'relative',
          zIndex: 5000,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <Link to="/" className="text-decoration-none">
            {/* Ίσως χρειαστεί να περάσεις style για να γίνει λευκό το logo αν είναι κείμενο */}
            <div style={{ color: 'white' }}> 
               <Logo as="h5" className="mb-0 logo-in-nav" />
            </div>
          </Link>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          {user?.role === 'owner' && (
            <Link
              to="/add-property"
              className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
              style={{
                background: "#fff", // <--- ΑΛΛΑΓΗ: Λευκό κουμπί για αντίθεση
                color: "#6f42c1",   // <--- ΑΛΛΑΓΗ: Μωβ γράμματα
                fontWeight: 600,
                border: "none"
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Property
            </Link>
          )}
          
          {/* ΑΛΛΑΓΗ 2: text-dark -> text-white */}
          <Link to="/messages" className="text-white text-decoration-none position-relative">
            Messages
            {unreadChats > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.65rem', border: '1px solid white' }}
              >
                {unreadChats}
              </span>
            )}
          </Link>

          {user?.role === 'client' && (
            <Link
              to="/appointments"
              // ΑΛΛΑΓΗ: text-dark -> text-white
              className={`text-decoration-none position-relative ${hasAppointments ? 'fw-bold text-warning' : 'text-white'}`}
            >
              Appointments
              {hasAppointments && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark"
                  style={{ fontSize: '0.65rem' }}
                >
                  New
                </span>
              )}
            </Link>
          )}
          
          {user?.role !== 'owner' && (
            // ΑΛΛΑΓΗ: text-dark -> text-white
            <Link to="/favorites" className="text-white text-decoration-none">Favorites</Link>
          )}

          {/* Notifications */}
          <div ref={dropdownRef} className="position-relative">
            <button
              className="btn btn-link text-decoration-none text-white p-0 position-relative" // ΑΛΛΑΓΗ: text-white
              onClick={handleToggleNotifications}
            >
              Notifications
              {unreadCount > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.65rem', border: '1px solid white' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {/* ... (το dropdown menu παραμένει λευκό για να διαβάζεται) ... */}
            {showNotifications && (
                 /* Ο κώδικας του dropdown παραμένει ίδιος */
                 <div className="position-absolute end-0 mt-2 bg-white border rounded shadow" style={{ width: 320, zIndex: 6500 }}>
                    {/* ...περιεχόμενα dropdown... */}
                 </div>
            )}
          </div>

          {/* Profile */}
          <Link
            to="/profile"
            className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm text-decoration-none"
            style={{
              background: 'rgba(255,255,255,0.2)', // Ημιδιάφανο λευκό
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            <img
              src={profileImg}
              alt="Profile"
              className="rounded-circle"
              style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #fff' }}
            />
            <span className="small">{user?.name || 'Profile'}</span>
          </Link>

          {/* ΑΛΛΑΓΗ 3: btn-outline-danger -> btn-light ή btn-outline-light */}
          <button className="btn btn-light rounded-pill px-3 text-purple fw-bold" onClick={handleLogout} style={{ color: '#6f42c1' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="container-fluid pt-4 px-4 px-lg-5">
        <div className="mb-3">
          <h2 className="fw-bold mb-1">Hi, {user?.name?.split(' ')[0] || 'there'}</h2>
          <div className="text-muted">
            {user?.role === 'owner'
              ? "Here's an overview of your listings."
              : "Here are some listings based on your preferences."}
          </div>
        </div>

        {/* Owner donut stats — FRACTIONS */}
        {user?.role === 'owner' && (
           <div className="dashboard-metrics mb-4">
            <div className="dashboard-metric-card">
              <Donut icon="💚" label="Favorited" value={likedListings} max={totalListings} />
            </div>
           <div className="dashboard-metric-card">
              {/* ΕΔΩ ΔΕΙΧΝΕΙ ΤΑ ΣΥΝΟΛΙΚΑ VIEWS */}
              <Donut icon="👁️" label="Total Views" value={totalViews} max={null} />
            </div>
            <div className="dashboard-metric-card">
              <Donut icon="🏡" label="Rented" value={rentedListings} max={totalListings} />
            </div>
          </div>
        )}
        {user?.role === 'owner' && (
          <div className="mb-4">
            <OwnerAppointmentsCalendar appointments={ownerAppointments} />
          </div>
        )}
      </div>

      {/* CONTENT: Listings grid */}
            <div className="container-fluid pb-4 px-4 px-lg-5">
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <h4 className="fw-bold mb-0">
            {user?.role === 'owner' ? 'Your Listings' : 'Featured Properties'}
          </h4>

          {user?.role === 'owner' && (
            <Link
              to="/add-property"
              className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm ms-auto"
              style={{
                background: 'linear-gradient(135deg,#4b0082,#e0b0ff)',
                color: '#fff',
                fontWeight: 600,
                border: 'none',
              }}
            >
              + Add Property
            </Link>
          )}

          {user?.role === 'client' && (
            <span
              className="badge rounded-pill ms-auto"
              style={{
                background: 'rgba(75,0,130,0.12)',
                color: '#4b0082',
                fontWeight: 600,
                letterSpacing: '0.3px',
              }}
            >
              {preferredDealType === 'sale' ? 'Showing properties for sale' : 'Showing rental properties'}
            </span>
          )}
        </div>

        {!Array.isArray(properties) || properties.length === 0 ? (
          <p className="text-muted">No properties found.</p>
        ) : (
          <>
            <div className="dashboard-listings-grid">
              {properties.map((prop) => (
                 <div className="dashboard-listing-card" key={prop._id}>
                  <PropertyCard
                    prop={prop}
                    isFavorite={favorites.includes(prop._id)}
                    onToggleFavorite={() => handleFavorite(prop._id)}
                    imgUrl={imgUrl}
                    showFavorite={user?.role !== 'owner'}
                    onOpen={() => navigate(`/property/${prop._id}`)}
                  />
                </div>
              ))}
            </div>

            {/* Pager */}
            {properties.length > 0 && totalPagesNum > 1 && (
              <div className="mt-4">
                <div className="d-flex justify-content-center align-items-center pagination-pills flex-wrap">
                  <button type="button" className="btn page-btn" onClick={goPrev} disabled={!canPrev}>
                    Prev
                  </button>

                  {Array.from({ length: totalPagesNum }).map((_, idx) => {
                    const p = idx + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={`btn page-btn ${p === page ? 'page-btn-active' : ''}`}
                        onClick={() => goPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}

                  <button type="button" className="btn page-btn" onClick={goNext} disabled={!canNext}>
                    Next
                  </button>
                </div>

                <p className="text-center text-muted small mb-0 mt-2">
                  Page {page} of {totalPagesNum}
                </p>
              </div>
            )}
          </>
        )}
      </div>

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