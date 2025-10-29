import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { getMessages, sendMessage } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Card,
  Button,
  Form,
  InputGroup,
  Modal,
  Alert,
  Badge,
  Spinner,
} from 'react-bootstrap';
import api from '../api';
import { proposeAppointment } from '../services/appointmentsService';
import Logo from '../components/Logo';
import './Chat.css';

const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

  const resolveSocketUrl = () => {
  const toOrigin = (maybeUrl) => {
    if (!maybeUrl) return '';
    if (typeof window === 'undefined') return '';
    try {
      return new URL(maybeUrl, window.location.origin).origin;
    } catch (_err) {
      return '';
    }
  };

  const explicitSocket = toOrigin(process.env.REACT_APP_SOCKET_URL);
  if (explicitSocket) return explicitSocket;

  const apiBased = toOrigin(process.env.REACT_APP_API_URL);
  if (apiBased) return apiBased;

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    if (/:(\d+)$/.test(origin)) {
      const port = origin.split(':').pop();
      if (port === '3000') {
        return origin.replace(/:3000$/, ':5000');
      }
    }
    return origin;
  }

  return '';
};

function normalizeUploadPath(src) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  const clean = src.replace(/^\/+/, '');
  return clean.startsWith('uploads/') ? `/${clean}` : `/uploads/${clean}`;
}

const assetUrl = (src, fallback) => {
  if (!src) return fallback;
  if (src.startsWith('http')) return src;
  return `${API_ORIGIN}${normalizeUploadPath(src)}`;
};

const iconForType = (t) => {
  switch (t) {
    case 'appointment':
      return '📅';
    case 'favorite':
      return '⭐';
    case 'property_removed':
      return '🏠❌';
    case 'message':
      return '💬';
    default:
      return '🔔';
  }
};

const titleForNote = (n) => {
  if (n?.message) return n.message;
  switch (n?.type) {
    case 'favorite':
      return `${n?.senderId?.name || 'Someone'} added your property to favorites.`;
    case 'property_removed':
      return 'A property you interacted with was removed.';
    case 'message':
      return 'New message received.';
    default:
      return 'Notification';
  }
};
function Chat() {
  const { propertyId, userId: receiverId } = useParams();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [property, setProperty] = useState(null);
  const [propertyError, setPropertyError] = useState('');
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [slotInputs, setSlotInputs] = useState(['']);
  const [proposalError, setProposalError] = useState('');
  const [proposalSuccess, setProposalSuccess] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [hasAppointments, setHasAppointments] = useState(false);
  const socket = useRef(null);
  const messagesEndRef = useRef(null);
    const dropdownRef = useRef(null);

  const SOCKET_URL = useMemo(() => resolveSocketUrl(), []);
  const pageGradient = useMemo(
    () => ({
      minHeight: '100vh',
      background: `radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)`,
    }),
    []
  );

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : '/default-avatar.jpg';
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
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const allMessages = await getMessages();
        const filteredMessages = allMessages
          .filter(
            (msg) =>
              msg.propertyId?._id === propertyId &&
              ((msg.senderId?._id === user.id && msg.receiverId?._id === receiverId) ||
                (msg.senderId?._id === receiverId && msg.receiverId?._id === user.id))
          )
          .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

        setMessages(filteredMessages);

        const participant = filteredMessages
          .map((msg) => (msg.senderId?._id === user.id ? msg.receiverId : msg.senderId))
          .find(Boolean);
        if (participant) {
          setOtherUser(participant);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    if (token) {
      fetchMessages();
    }
  }, [propertyId, receiverId, token, user.id]);
   useEffect(() => {
    const now = new Date();
    localStorage.setItem('lastMessageCheck', now.toISOString());
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    fetchUnreadMessages();

    const endpoint = user.role === 'owner' ? '/appointments/owner' : '/appointments/tenant';
    api
      .get(endpoint)
      .then((res) => {
        const appts = Array.isArray(res.data) ? res.data : [];
        const hasActiveAppts = appts.some((appt) => {
          const status = (appt.status || '').toLowerCase();
          return status === 'pending' || status === 'confirmed';
        });
        setHasAppointments(hasActiveAppts);
      })
      .catch(() => {
        setHasAppointments(false);
      });
  }, [user, fetchNotifications, fetchUnreadMessages]);

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
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!user?.id || !SOCKET_URL) return undefined;

    socket.current = io(SOCKET_URL, {
      reconnectionAttempts: 3,
      transports: ['websocket'],
      path: process.env.REACT_APP_SOCKET_PATH || '/socket.io',
      withCredentials: true,
      auth: token ? { token } : undefined,
    });
    socket.current.emit('join', user.id);

    const handleNewMessage = (newMessage) => {
      if (
        newMessage.propertyId?._id === propertyId &&
        ((newMessage.senderId?._id === user.id && newMessage.receiverId?._id === receiverId) ||
          (newMessage.senderId?._id === receiverId && newMessage.receiverId?._id === user.id))
      ) {
        setMessages((prev) => {
          if (newMessage?._id && prev.some((msg) => msg._id === newMessage._id)) {
            return prev;
          }
           return [...prev, newMessage];
        });
        const participant =
          newMessage.senderId?._id === user.id ? newMessage.receiverId : newMessage.senderId;
        if (participant) {
          setOtherUser(participant);
        }
      }
    };

      socket.current.on('newMessage', handleNewMessage);

    return () => {
      socket.current?.off('newMessage', handleNewMessage);
      socket.current?.disconnect();
    };
  }, [SOCKET_URL, propertyId, receiverId, token, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let ignore = false;
    const fetchProperty = async () => {
      if (!propertyId) return;
      setLoadingProperty(true);
      setPropertyError('');
      try {
        const res = await api.get(`/properties/${propertyId}`);
        if (!ignore) {
          setProperty(res.data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load property info', err);
          setProperty(null);
          setPropertyError('Failed to load property details.');
        }
      } finally {
        !ignore && setLoadingProperty(false);
      }
    };

    if (token) {
      fetchProperty();
    }

    return () => {
      ignore = true;
    };
  }, [propertyId, token]);

  const isOwnerOfProperty = useMemo(() => {
    if (!user || user.role !== 'owner' || !property) return false;
    const ownerId = property?.ownerId?._id || property?.ownerId;
    return ownerId && String(ownerId) === String(user.id);
  }, [property, user]);

  const canProposeAppointment =
    isOwnerOfProperty && receiverId && String(receiverId) !== String(user?.id);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const savedMessage = await sendMessage(receiverId, propertyId, newMessage);
      if (
        savedMessage?.propertyId?._id === propertyId &&
        ((savedMessage.senderId?._id === user.id && savedMessage.receiverId?._id === receiverId) ||
          (savedMessage.senderId?._id === receiverId && savedMessage.receiverId?._id === user.id))
      ) {
        setMessages((prev) => {
          if (savedMessage?._id && prev.some((msg) => msg._id === savedMessage._id)) {
            return prev;
          }
          return [...prev, savedMessage];
        });
        const participant =
          savedMessage.senderId?._id === user.id ? savedMessage.receiverId : savedMessage.senderId;
        if (participant) {
          setOtherUser(participant);
        }
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message.');
    }
  };
  const handleProposalSlotChange = (index, value) => {
    setSlotInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddSlot = () => {
    setSlotInputs((prev) => [...prev, '']);
  };

  const handleRemoveSlot = (index) => {
    setSlotInputs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [''];
    });
  };

  const resetProposalState = () => {
    setSlotInputs(['']);
    setProposalError('');
    setSubmittingProposal(false);
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    setProposalError('');
    setSubmittingProposal(true);
    try {
      const normalizedSlots = slotInputs
        .map((slot) => (slot ? new Date(slot) : null))
        .filter((date) => date && !Number.isNaN(date.getTime()))
        .map((date) => date.toISOString());

      if (!normalizedSlots.length) {
        setProposalError('Please add at least one valid date and time.');
        setSubmittingProposal(false);
        return;
      }

      await proposeAppointment({
        propertyId,
        tenantId: receiverId,
        availableSlots: normalizedSlots,
      });

      setProposalSuccess(
        `Sent ${normalizedSlots.length} appointment option${
          normalizedSlots.length > 1 ? 's' : ''
        } to the tenant.`
      );
      setShowProposalModal(false);
      resetProposalState();
    } catch (err) {
      console.error('Failed to propose appointment', err);
      setProposalError(
        err.response?.data?.message || 'Failed to propose appointment slots.'
      );
    } finally {
      setSubmittingProposal(false);
    }
  };


  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleToggleNotifications = async () => {
    const nextOpen = !showNotifications;
    setShowNotifications(nextOpen);
    if (nextOpen) {
      const unread = notifications.filter((n) => !n.readAt && !n.read);
      if (unread.length) {
        try {
          await Promise.all(unread.map((n) => api.patch(`/notifications/${n._id}/read`)));
          const now = new Date().toISOString();
          setNotifications((prev) =>
            prev.map((n) => (unread.some((u) => u._id === n._id) ? { ...n, read: true, readAt: now } : n))
          );
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
      navigate('/appointments');
    } else if (note.referenceId) {
      navigate(`/property/${note.referenceId}`);
    }
    setShowNotifications(false);
  };

  const otherUserAvatar = otherUser?.profilePicture
    ? assetUrl(otherUser.profilePicture, '/default-avatar.jpg')
    : '/default-avatar.jpg';

  const propertyImage = property?.images?.[0]
    ? assetUrl(property.images[0], 'https://placehold.co/320x220?text=No+Image')
    : 'https://placehold.co/320x220?text=No+Image';

  const propertyTypeVariant = property?.type === 'rent' ? 'info' : 'success';

  const propertyLocation = property?.location || property?.city || property?.address || '';

  const formattedReceiverName = otherUser?.name || 'Conversation';

  return (
    <div style={pageGradient} className="pb-5">
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
        <Link to="/dashboard" className="navbar-brand">
          <Logo as="h5" className="mb-0 logo-in-nav" />
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navContent"
          aria-controls="navContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navContent">
          <div className="navbar-nav ms-auto align-items-center">
            <Link to="/messages" className="nav-link text-dark position-relative">
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
                className={`nav-link position-relative ${hasAppointments ? 'fw-semibold text-success' : 'text-dark'}`}
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
              <Link to="/favorites" className="nav-link text-dark">Favorites</Link>
            )}
            <div ref={dropdownRef} className="nav-item position-relative">
              <button
                className="btn btn-link nav-link text-decoration-none text-dark p-0 position-relative"
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
            <Link to="/profile" className="nav-link">
              <img
                src={profileImg}
                alt="Profile"
                className="rounded-circle"
                style={{ width: 32, height: 32, objectFit: 'cover', border: '2px solid #e5e7eb' }}
              />
            </Link>
            <button
              className="btn btn-outline-danger rounded-pill px-3 mt-2 mt-lg-0 ms-lg-2"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <Container className="py-4" style={{ maxWidth: 980 }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="light"
              onClick={() => navigate('/messages')}
              className="p-2 back-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="currentColor"
                className="bi bi-arrow-left"
                viewBox="0 0 16 16"
              >
                <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z" />
              </svg>
            </Button>
            <div>
              <h2 className="fw-bold mb-1">{formattedReceiverName}</h2>
              <p className="text-muted mb-0 small">Conversation regarding this property</p>
            </div>
          </div>

          {canProposeAppointment && (
            <Button
              variant="success"
              className="rounded-pill px-3"
              onClick={() => {
                setShowProposalModal(true);
                setProposalError('');
              }}
              disabled={loadingProperty}
            >
              Propose appointment
            </Button>
          )}
        </div>

        <Card className="shadow-sm border-0 glass-panel chat-card">
          {(property || loadingProperty || propertyError) && (
            <Card.Header className="bg-transparent border-0 pb-0">
              <div className="chat-property d-flex align-items-start gap-3">
                <div className="chat-property-thumb">
                  {loadingProperty ? (
                    <div className="chat-property-loading">
                      <Spinner animation="border" size="sm" />
                    </div>
                  ) : (
                    <img src={propertyImage} alt={property?.title || 'Property'} />
                  )}
                </div>
                <div className="flex-grow-1">
                  {propertyError ? (
                    <Alert variant="danger" className="mb-0 py-2">
                      {propertyError}
                    </Alert>
                  ) : (
                    property && (
                      <>
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <h5 className="mb-0 me-2">{property.title}</h5>
                          {property?.type && (
                            <Badge bg={propertyTypeVariant} pill>
                              {property.type === 'rent' ? 'For Rent' : 'For Sale'}
                            </Badge>
                          )}
                          {property?.status && (
                            <Badge bg={property.status === 'available' ? 'success' : 'secondary'} pill>
                              {property.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted small mb-0">{propertyLocation}</p>
                      </>
                    )
                  )}
                </div>
              </div>
            </Card.Header>
          )}

          {proposalSuccess && (
            <Card.Body className="bg-transparent pt-3 pb-0">
              <Alert
                variant="success"
                className="mb-0"
                onClose={() => setProposalSuccess('')}
                dismissible
              >
                {proposalSuccess}
              </Alert>
            </Card.Body>
          )}

          <Card.Body className="chat-body">
            <div className="chat-counterpart d-flex align-items-center gap-3 mb-3">
              <div className="chat-counterpart-avatar">
                <img src={otherUserAvatar} alt={formattedReceiverName} />
              </div>
              <div>
                <h6 className="mb-0">{formattedReceiverName}</h6>
                {otherUser?.email && <small className="text-muted">{otherUser.email}</small>}
              </div>
            </div>
            <div className="chat-scroll">
              {messages.map((msg) => {
                const isSelf = msg.senderId?._id === user.id;
                return (
                  <div
                    key={msg._id}
                    className={`message-row ${isSelf ? 'self' : 'other'}`}
                  >
                    <div className={`message-bubble ${isSelf ? 'bubble-self' : 'bubble-other'}`}>
                      <p className="mb-1">{msg.content}</p>
                      <span className="message-meta">
                        {new Date(msg.timeStamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </Card.Body>
          <Card.Footer className="bg-transparent border-0 pt-0">
            <Form onSubmit={handleSend}>
              <InputGroup className="chat-input-group">
                <Form.Control
                  as="textarea"
                  rows={1}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  required
                  className="chat-input"
                />
                <Button type="submit" className="chat-send-btn">
                  Send
                </Button>
              </InputGroup>
            </Form>
          </Card.Footer>
        </Card>

        <Modal
        show={showProposalModal}
        onHide={() => {
          setShowProposalModal(false);
          resetProposalState();
        }}
        centered
      >
        <Form onSubmit={handlePropose}>
          <Modal.Header closeButton>
            <Modal.Title>Propose appointment times</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted">
              Suggest one or more date and time options for the tenant to choose
              from.
            </p>
            {proposalError && (
              <Alert variant="danger" onClose={() => setProposalError('')} dismissible>
                {proposalError}
              </Alert>
            )}
            {slotInputs.map((slot, index) => (
              <InputGroup className="mb-2" key={`slot-${index}`}>
                <Form.Control
                  type="datetime-local"
                  value={slot}
                  onChange={(event) =>
                    handleProposalSlotChange(index, event.target.value)
                  }
                  required
                />
                {slotInputs.length > 1 && (
                  <Button
                    variant="outline-danger"
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                  >
                    Remove
                  </Button>
                )}
              </InputGroup>
            ))}
            <Button
              variant="outline-primary"
              type="button"
              onClick={handleAddSlot}
            >
              Add another option
            </Button>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowProposalModal(false);
                resetProposalState();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={submittingProposal}
            >
              {submittingProposal ? 'Sending…' : 'Send proposal'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
      </Container>
    </div>
  );
}

export default Chat;
