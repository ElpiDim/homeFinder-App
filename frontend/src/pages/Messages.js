import React, { useEffect, useState } from 'react';
import { getMessages } from '../services/messagesService';
import AppShell from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

function Messages() {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

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
          } else if (new Date(msg.timeStamp) > new Date(acc[key].lastMessage.timeStamp)) {
            acc[key].lastMessage = msg;
          }
          return acc;
        }, {});
        setConversations(Object.values(groupedConversations));
        localStorage.setItem('lastMessageCheck', new Date().toISOString());
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    if (token && user?.id) {
      fetchMessages();
    }
  }, [token, user?.id]);

  const handleConversationClick = (propertyId, otherUserId) => {
    navigate(`/messages/property/${propertyId}/user/${otherUserId}`);
  };

  return (
    <AppShell
      container="md"
      hero={
        <div className="surface-section">
          <h1 className="fw-bold mb-2">Conversations</h1>
          <p className="text-muted mb-0">Pick up where you left off with owners, agents and clients.</p>
        </div>
      }
      navRight={<Link to="/dashboard" className="btn btn-brand-outline">Back to dashboard</Link>}
    >
      <section className="surface-card surface-card--glass">
        {conversations.length === 0 ? (
          <div className="text-center text-muted py-5">No conversations yet. Start by sending a message from a property page.</div>
        ) : (
          <div className="conversation-list">
            {conversations.map(({ property, otherUser, lastMessage }) => (
              <button
                key={`${property._id}-${otherUser._id}`}
                type="button"
                className="conversation-item"
                onClick={() => handleConversationClick(property._id, otherUser._id)}
              >
                <div className="conversation-item__heading">
                  <h5 className="mb-0 text-truncate">{property.title}</h5>
                  <small className="text-muted">{new Date(lastMessage.timeStamp).toLocaleDateString()}</small>
                </div>
                <p className="mb-1 text-start text-muted small">
                  Conversation with <strong>{otherUser.name}</strong>
                </p>
                <span className="conversation-item__preview text-start text-truncate">
                  {lastMessage.content}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

export default Messages;
