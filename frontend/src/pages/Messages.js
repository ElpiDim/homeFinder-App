import React, { useEffect, useState, useMemo } from 'react';
import { getMessages } from '../services/messagesService';
import { Container, Card, Button, ListGroup, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import './Messages.css';

const API_ORIGIN =
  (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/+$/, '') : '') ||
  (typeof window !== 'undefined' ? window.location.origin : '');

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

function Messages() {
  const { user, token, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [lastChecked, setLastChecked] = useState(() => {
    const stored = localStorage.getItem('lastMessageCheck');
    return stored ? new Date(stored).toLocaleString() : null;
  });
  const navigate = useNavigate();

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : '/default-avatar.jpg';

  const pageGradient = useMemo(
    () => ({
      minHeight: '100vh',
      background: `radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)`,
    }),
    []
  );

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getMessages();
        const groupedConversations = data.reduce((acc, msg) => {
          const otherUser =
            msg.senderId._id === user.id ? msg.receiverId : msg.senderId;
          const property = msg.propertyId;
          const key = `${property._id}-${otherUser._id}`;

          if (!acc[key]) {
            acc[key] = {
              property,
              otherUser,
              lastMessage: msg,
            };
          } else if (
            new Date(msg.timeStamp) > new Date(acc[key].lastMessage.timeStamp)
          ) {
            acc[key].lastMessage = msg;
          }
          return acc;
        }, {});

        const grouped = Object.values(groupedConversations);
        grouped.sort(
          (a, b) => new Date(b.lastMessage.timeStamp) - new Date(a.lastMessage.timeStamp)
        );
        setConversations(grouped);

        const now = new Date();
        setLastChecked(now.toLocaleString());
        localStorage.setItem('lastMessageCheck', now.toISOString());
      } catch (err) {
        console.error('Failed to load messages', err);
        setConversations([]);
      }
    };

    if (token) {
      fetchMessages();
    }
  }, [token, user.id]);

  const handleConversationClick = (propertyId, otherUserId) => {
    navigate(`/messages/property/${propertyId}/user/${otherUserId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
            <Link to="/messages" className="nav-link text-dark position-relative">Messages</Link>
            {user?.role !== 'owner' && (
              <Link to="/favorites" className="nav-link text-dark">Favorites</Link>
            )}
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

      <Container className="mt-4" style={{ maxWidth: 1000 }}>
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="light"
              onClick={() => navigate('/dashboard')}
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
              <h2 className="fw-bold mb-1">Conversations</h2>
              <p className="text-muted mb-0">Keep track of every property discussion in one place.</p>
            </div>
          </div>
          <div className="text-muted small">
            Last checked: {lastChecked || '—'}
          </div>
        </div>

        <Card className="shadow-sm border-0 glass-panel">
          <Card.Body className="p-0">
            {conversations.length === 0 ? (
              <div className="text-center text-muted py-5">No conversations yet.</div>
            ) : (
              <ListGroup variant="flush" className="conversation-list">
                {conversations.map(({ property, otherUser, lastMessage }) => {
                  const conversationKey = `${property._id}-${otherUser._id}`;
                  const otherUserAvatar = assetUrl(
                    otherUser.profilePicture,
                    '/default-avatar.jpg'
                  );
                  const propertyImage = property?.images?.[0]
                    ? assetUrl(property.images[0], 'https://placehold.co/160x120?text=No+Image')
                    : 'https://placehold.co/160x120?text=No+Image';
                  const propertyTypeVariant = property?.type === 'rent' ? 'info' : 'success';
                  const propertyLocation = property?.location || property?.city || property?.address || '';

                  return (
                    <ListGroup.Item
                      key={conversationKey}
                      action
                      onClick={() => handleConversationClick(property._id, otherUser._id)}
                      className="conversation-item p-3 p-md-4"
                    >
                      <div className="conversation-inner">
                        <div className="conversation-media">
                          <div className="conversation-property-thumb">
                            <img src={propertyImage} alt={property.title} />
                          </div>
                          <div className="conversation-avatar">
                            <img src={otherUserAvatar} alt={otherUser.name} />
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                            <div>
                              <h5 className="mb-1">{property.title}</h5>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
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
                                {propertyLocation && (
                                  <span className="text-muted small">{propertyLocation}</span>
                                )}
                              </div>
                            </div>
                            <small className="text-muted conversation-date">
                              {new Date(lastMessage.timeStamp).toLocaleString()}
                            </small>
                          </div>
                          <p className="mb-1 text-muted">
                            With <strong>{otherUser.name}</strong>
                          </p>
                          <p className="mb-0 conversation-content">{lastMessage.content}</p>
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default Messages;
