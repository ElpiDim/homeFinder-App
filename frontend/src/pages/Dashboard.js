// src/pages/Dashboard.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import AppointmentModal from '../components/AppointmentModal';
import OwnerAppointmentsCalendar from '../components/OwnerAppointmentsCalendar';
import PropertyCard from '../components/propertyCard';
import Logo from '../components/Logo';
import { getMessages } from '../services/messagesService';
import { getApiOrigin, resolveUploadUrl } from '../utils/uploads';

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
const API_ORIGIN = getApiOrigin();

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
  const [unreadMessages, setUnreadMessages] = useState(0);

  // geolocation (kept for parity; not shown on UI)
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // owner stats (optional from backend)
  const [ownerStats, setOwnerStats] = useState(null);

  // refs
  const dropdownRef = useRef(null);

  const profileImg = user?.profilePicture
    ? resolveUploadUrl(user.profilePicture, API_ORIGIN) || '/default-avatar.jpg'
    : '/default-avatar.jpg';

  /* ---------- utils ---------- */
  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

  const imgUrl = (src) => {
    const url = resolveUploadUrl(src, API_ORIGIN);
    return url || 'https://via.placeholder.com/400x225?text=No+Image';
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

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages();
      const lastCheck = localStorage.getItem('lastMessageCheck');
      const lastDate = lastCheck ? new Date(lastCheck) : new Date(0);
      const count = msgs.filter(
        (m) =>
          (m.receiverId?._id === user?.id || m.receiverId === user?.id) &&
          new Date(m.timeStamp) > lastDate
      ).length;
      setUnreadMessages(count);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setUnreadMessages(0);
    }
  }, [user?.id]);

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
    fetchUnreadMessages();
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
  }, [user, fetchAllProperties, fetchNotifications, fetchUnreadMessages, fetchOwnerStats]);

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
    if (!user) return;
    const id = setInterval(fetchUnreadMessages, 30000);
    return () => clearInterval(id);
  }, [user, fetchUnreadMessages]);
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

  const seenListings = useMemo(
    () => (user?.role === 'owner'
      ? allProperties.filter(p => Number(p.views || 0) > 0).length
      : 0),
    [user?.role, allProperties]
  );

  const rentedListings = useMemo(
    () => (user?.role === 'owner'
      ? allProperties.filter(p => (p.status || '').toLowerCase() === 'rented').length
      : 0),
    [user?.role, allProperties]
  );

  /* ---------- Donut (SVG, fraction-based) ---------- */
  const Donut = ({ value = 0, max = 0, label = 'Label', icon = '💚' }) => {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
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
              stroke="#22c55e"
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
            <div className="text-muted" style={{ fontSize: 12 }}>of {max}</div>
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
          <Link to="/" className="text-decoration-none">
            <Logo as="h5" className="mb-0 logo-in-nav" />
          </Link>
        </div>

        <div className="ms-auto d-flex align-items-center gap-3">
          {user?.role === 'owner' && (
            <Link
              to="/add-property"
              className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
              style={{
                background: "linear-gradient(135deg,#006400,#90ee90)",
                color: "#fff",
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
          <Link to="/messages" className="text-dark text-decoration-none position-relative">
            Messages
            {unreadMessages > 0 && (
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.65rem' }}
              >
                {unreadMessages}
              </span>
            )}
          </Link>
            {user?.role === 'client' && (
            <Link
              to="/appointments"
              className={`text-decoration-none position-relative ${hasAppointments ? 'fw-semibold text-success' : 'text-dark'}`}
            >
              Appointments
              {hasAppointments && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success"
                  style={{ fontSize: '0.65rem' }}
                >
                  New
                </span>
              )}
            </Link>
          )}
          {user?.role !== 'owner' && (
            <Link to="/favorites" className="text-dark text-decoration-none">Favorites</Link>
          )}

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
                          style={{ cursor: 'pointer', background: note.readAt || note.read ? '#fff' : '#f8fafc' }}
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

          {/* Profile */}
          <Link
            to="/profile"
            className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm text-decoration-none"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg,#006400,#90ee90)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.border = 'none'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#111827'; e.currentTarget.style.border = '1px solid #e5e7eb'; }}
            style={{
              background: '#fff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              fontWeight: 500,
              transition: 'background 200ms ease, color 200ms ease, border 200ms ease',
            }}
          >
            <img
              src={profileImg}
              alt="Profile"
              className="rounded-circle"
              style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #e5e7eb' }}
            />
            <span className="small">{user?.name || 'Profile'}</span>
          </Link>

          <button className="btn btn-outline-danger rounded-pill px-3" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div className="container pt-4" style={{ maxWidth: 1120 }}>
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
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-4">
              <Donut icon="💚" label="Favorited" value={likedListings} max={totalListings} />
            </div>
            <div className="col-12 col-md-4">
              <Donut icon="👁️" label="Seen" value={seenListings} max={totalListings} />
            </div>
            <div className="col-12 col-md-4">
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
      <div className="container pb-4" style={{ maxWidth: 1120 }}>
        <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
          <h4 className="fw-bold mb-0">
            {user?.role === 'owner' ? 'Your Listings' : 'Featured Properties'}
          </h4>

          {user?.role === 'owner' && (
            <Link
              to="/add-property"
              className="btn d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm ms-auto"
              style={{
                background: 'linear-gradient(135deg,#006400,#90ee90)',
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
                background: 'rgba(0,100,0,0.12)',
                color: '#006400',
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
            <div className="row g-3">
              {properties.map((prop) => (
                <div className="col-sm-6 col-lg-4" key={prop._id}>
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
