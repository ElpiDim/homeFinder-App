import React, { useEffect, useState, useMemo } from 'react';
import { getMessages } from '../services/messagesService';
import { Container, Card, Button, ListGroup } from 'react-bootstrap';
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

function Messages() {
  const { user, token, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  const profileImg = user?.profilePicture
    ? (user.profilePicture.startsWith('http')
        ? user.profilePicture
        : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`)
    : '/default-avatar.jpg';

  const pageGradient = useMemo(() => ({
    minHeight: '100vh',
    background:
      'radial-gradient(700px circle at 18% 12%, rgba(255,255,255,.55), rgba(255,255,255,0) 42%),\
       linear-gradient(135deg, #eaf7ec 0%, #e4f8ee 33%, #e8fbdc 66%, #f6fff2 100%)',
  }), []);

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
          } else {
            if (new Date(msg.timeStamp) > new Date(acc[key].lastMessage.timeStamp)) {
              acc[key].lastMessage = msg;
            }
          }
          return acc;
        }, {});
        setConversations(Object.values(groupedConversations));
        localStorage.setItem('lastMessageCheck', new Date().toISOString());
      } catch (err) {
        console.error('Failed to load messages', err);
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
    <div style={pageGradient}>
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
            <Link to="/appointments" className="nav-link text-dark">Appointments</Link>
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
            <button className="btn btn-outline-danger rounded-pill px-3 mt-2 mt-lg-0 ms-lg-2" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <Container className="mt-4" style={{ maxWidth: 960 }}>
        <div className="d-flex align-items-center mb-4">
          <Button variant="light" onClick={() => navigate('/dashboard')} className="me-3 p-2 back-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-arrow-left" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
          </Button>
          <h2 className="fw-bold mb-0">Conversations</h2>
        </div>

        {conversations.length === 0 ? (
          <p className="text-center text-muted">No conversations yet.</p>
        ) : (
          <ListGroup variant="flush">
            {conversations.map(({ property, otherUser, lastMessage }) => (
              <ListGroup.Item
                key={`${property._id}-${otherUser._id}`}
                action
                onClick={() => handleConversationClick(property._id, otherUser._id)}
                className="conversation-item"
              >
                <div className="d-flex w-100 align-items-center">
                  <img
                    src={otherUser.profilePicture ? normalizeUploadPath(otherUser.profilePicture) : '/default-avatar.jpg'}
                    alt={otherUser.name}
                    className="rounded-circle me-3"
                    style={{ width: 50, height: 50, objectFit: 'cover' }}
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between">
                      <h5 className="mb-1">{property.title}</h5>
                      <small>{new Date(lastMessage.timeStamp).toLocaleDateString()}</small>
                    </div>
                    <p className="mb-1 text-muted">
                      Conversation with <strong>{otherUser.name}</strong>
                    </p>
                    <p className="mb-0 conversation-content">{lastMessage.content}</p>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Container>
    </div>
  );
}

export default Messages;