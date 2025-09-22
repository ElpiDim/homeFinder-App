// src/pages/Dashboard.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import api from '../api';
import GoogleMapView from '../components/GoogleMapView';
import AppointmentModal from '../components/AppointmentModal';
import PropertyCard from '../components/propertyCard';
import Logo from '../components/Logo';
import { getMessages } from '../services/messagesService';

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

  /* ---------- state ---------- */
  const [allProperties, setAllProperties] = useState([]);
  const [properties, setProperties] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const [favorites, setFavorites] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [hasAppointments, setHasAppointments] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // geolocation
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // refs
  const dropdownRef = useRef(null);
  const profileMenuRef = useRef(null);

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : '/default-avatar.jpg';

  /* ---------- utils ---------- */
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
        const confirmed = appts.filter((appt) => appt.status === 'confirmed');
        setHasAppointments(confirmed.length > 0);
      })
      .catch(() => setHasAppointments(false));
  }, [user, fetchAllProperties, fetchNotifications, fetchUnreadMessages]);

  useEffect(() => {
    const total = allProperties.length;
    const totalPagesCalc = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(Math.max(1, page), totalPagesCalc);
    const start = (safePage - 1) * limit;
    setProperties(allProperties.slice(start, start + limit));
    setMeta({ total, totalPages: totalPagesCalc, limit, page: safePage });
  }, [page, limit, allProperties]);

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
    const handleClickOutside = (e) => {
      const outsideNotifications = dropdownRef.current && !dropdownRef.current.contains(e.target);
      const outsideProfile = profileMenuRef.current && !profileMenuRef.current.contains(e.target);
      if (outsideNotifications) setShowNotifications(false);
      if (outsideProfile) setShowProfileMenu(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  /* ---------- handlers ---------- */
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

  const renderPager = () => {
    if (!properties || properties.length === 0) return null;
    if (!(totalPagesNum && totalPagesNum > 1)) return null;

    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPagesNum, start + windowSize - 1);

    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    const Ellipsis = () => <span className="page-ellipsis">…</span>;

    return (
      <div className="mt-3">
        <div className="d-flex justify-content-center align-items-center pagination-pills flex-wrap">
          <button type="button" className="btn page-btn" onClick={goPrev} disabled={!canPrev}>
            Prev
          </button>

          {start > 1 && (
            <>
              <button
                type="button"
                className={`btn page-btn ${page === 1 ? 'page-btn-active' : ''}`}
                onClick={() => goPage(1)}
              >
                1
              </button>
              {start > 2 && <Ellipsis />}
            </>
          )}

          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`btn page-btn ${p === page ? 'page-btn-active' : ''}`}
              onClick={() => goPage(p)}
            >
              {p}
            </button>
          ))}

          {end < totalPagesNum && (
            <>
              {end < totalPagesNum - 1 && <Ellipsis />}
              <button
                type="button"
                className={`btn page-btn ${page === totalPagesNum ? 'page-btn-active' : ''}`}
                onClick={() => goPage(totalPagesNum)}
              >
                {totalPagesNum}
              </button>
            </>
          )}

          <button type="button" className="btn page-btn" onClick={goNext} disabled={!canNext}>
            Next
          </button>
        </div>

        <p className="text-center text-muted small mb-0 mt-2">
          Page {page} of {totalPagesNum}
        </p>
      </div>
    );
  };

  if (!user) {
    return (
      <AppShell container="md" hero={<div className="surface-section text-center"><Logo /><p className="text-muted mb-0">Loading dashboard…</p></div>}>
        <div className="surface-card text-center">Preparing your space…</div>
      </AppShell>
    );
  }

  const hero = (
    <div className="surface-section">
      <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-4">
        <div>
          <p className="text-uppercase text-muted small mb-1">Dashboard</p>
          <h1 className="fw-bold mb-2">Hello, {user?.name || 'there'} 👋</h1>
          <p className="text-muted mb-3">Stay on top of your matches, appointments and conversations.</p>
          <div className="d-flex flex-wrap gap-2">
            <span className="pill">Unread messages: {unreadMessages}</span>
            {hasAppointments && <span className="pill" style={{ background: 'rgba(53,176,102,0.18)', color: '#1c6f43' }}>Confirmed visits booked</span>}
            {user?.role === 'client' && (
              <span className="pill">Viewing: {preferredDealType === 'sale' ? 'Homes for sale' : 'Homes for rent'}</span>
            )}
          </div>
        </div>
        <div className="surface-card surface-card--flat d-flex flex-column gap-2" style={{ minWidth: 220 }}>
          <div className="mini-stat">
            <span className="text-muted small d-block">Total matches</span>
            <strong>{meta.total}</strong>
          </div>
          <div className="mini-stat">
            <span className="text-muted small d-block">Favorites saved</span>
            <strong>{favorites.length}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppShell
      container="xl"
      hero={hero}
      navRight={
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {user?.role === 'owner' && (
            <Link to="/add-property" className="btn btn-brand">
              + Add property
            </Link>
          )}
          <Link to="/appointments" className="btn btn-soft">Appointments</Link>
          <Link to="/messages" className="btn btn-soft position-relative">
            Messages
            {unreadMessages > 0 && (
              <span className="notify-badge">{unreadMessages}</span>
            )}
          </Link>
          <Link to="/favorites" className="btn btn-soft">Favorites</Link>

          <div ref={dropdownRef} className="position-relative">
            <button
              type="button"
              className="btn btn-soft position-relative"
              onClick={handleToggleNotifications}
            >
              Notifications
              {unreadCount > 0 && <span className="notify-badge">{unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="popover-card popover-card--right">
                <div className="popover-card__body">
                  {notifications.length === 0 ? (
                    <div className="text-center text-muted py-4">No notifications yet.</div>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {notifications.map((note) => (
                        <li
                          key={note._id}
                          className={`popover-item ${note.readAt || note.read ? '' : 'is-unread'}`}
                          onClick={() => handleNotificationClick(note)}
                        >
                          <span className="popover-item__icon">{iconForType(note.type)}</span>
                          <span className="popover-item__text">{titleForNote(note)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="popover-card__footer">
                  <Link to="/notifications" className="btn btn-brand-outline w-100" onClick={() => setShowNotifications(false)}>
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} className="position-relative">
            <button
              type="button"
              className="btn btn-soft d-flex align-items-center gap-2"
              onClick={() => setShowProfileMenu((v) => !v)}
              aria-haspopup="true"
              aria-expanded={showProfileMenu ? 'true' : 'false'}
            >
              <img
                src={profileImg}
                alt="Profile"
                className="rounded-circle"
                style={{ width: 36, height: 36, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)' }}
              />
              <span>{user?.name || 'Profile'}</span>
            </button>
            {showProfileMenu && (
              <div className="popover-card popover-card--right">
                <div className="popover-card__body">
                  <button type="button" className="popover-item" onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}>
                    <span className="popover-item__icon">👤</span>
                    <span className="popover-item__text">Profile</span>
                  </button>
                  <button type="button" className="popover-item" onClick={() => { navigate('/edit-profile'); setShowProfileMenu(false); }}>
                    <span className="popover-item__icon">✏️</span>
                    <span className="popover-item__text">Edit profile</span>
                  </button>
                  {user?.role === 'owner' && (
                    <button type="button" className="popover-item" onClick={() => { navigate('/my-properties'); setShowProfileMenu(false); }}>
                      <span className="popover-item__icon">🏡</span>
                      <span className="popover-item__text">My properties</span>
                    </button>
                  )}
                </div>
                <div className="popover-card__footer">
                  <button type="button" className="btn btn-brand-outline w-100" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="surface-section">
        <div className="row g-4">
          <div className="col-lg-7">
            <section className="surface-card h-100">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                <h4 className="fw-bold mb-0">Recommended properties</h4>
                {user?.role === 'owner' && (
                  <>
                    <Link to="/add-property" className="btn btn-brand-outline">Add property</Link>
                    <Link to="/match/clients" className="btn btn-brand-outline">Suggested tenants</Link>
                  </>
                )}
                {user?.role === 'client' && (
                  <span className="pill ms-lg-auto">Tailored for you</span>
                )}
              </div>

              {!Array.isArray(properties) || properties.length === 0 ? (
                <div className="text-center text-muted py-5">No properties found.</div>
              ) : (
                <>
                  <div className="row g-3">
                    {properties.map((prop) => (
                      <div className="col-sm-6" key={prop._id}>
                        <PropertyCard
                          prop={prop}
                          isFavorite={favorites.includes(prop._id)}
                          onToggleFavorite={() => handleFavorite(prop._id)}
                          imgUrl={imgUrl}
                          onOpen={() => navigate(`/property/${prop._id}`)}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">{renderPager()}</div>
                </>
              )}
            </section>
          </div>

          <div className="col-lg-5">
            <section className="surface-card surface-card--glass h-100">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fw-semibold mb-0">Live map</h5>
                <button type="button" className="btn btn-soft" onClick={() => fetchAllProperties({ page: 1 })}>
                  Refresh
                </button>
              </div>
              <div className="rounded-4 overflow-hidden shadow-soft" style={{ minHeight: 360 }}>
                <GoogleMapView
                  properties={allProperties}
                  height="360px"
                  useClustering={false}
                  navigateOnMarkerClick
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      {selectedAppointmentId && (
        <AppointmentModal
          appointmentId={selectedAppointmentId}
          onClose={() => setSelectedAppointmentId(null)}
        />
      )}
    </AppShell>
  );
}

export default Dashboard;
