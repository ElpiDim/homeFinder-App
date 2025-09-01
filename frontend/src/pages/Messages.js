import React, { useEffect, useState } from 'react';
import { getMessages } from '../services/messagesService';
import { Container, Card, Button, ListGroup } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Messages() {
  const { user,token } = useAuth();
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

  return (
    <Container className="mt-4">
      <Button
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate('/dashboard')}
      >
        Back
      </Button>
      <h3>Conversations</h3>
      {conversations.length === 0 ? (
        <p>No conversations yet.</p>
      ) : (
        <ListGroup>
          {conversations.map(({ property, otherUser, lastMessage }) => (
            <ListGroup.Item
              key={`${property._id}-${otherUser._id}`}
              action
              onClick={() => handleConversationClick(property._id, otherUser._id)}
            >
              <div className="d-flex w-100 justify-content-between">
                <h5 className="mb-1">{property.title}</h5>
                <small>{new Date(lastMessage.timeStamp).toLocaleDateString()}</small>
              </div>
              <p className="mb-1">
                Conversation with <strong>{otherUser.name}</strong>
              </p>
              <small>{lastMessage.content}</small>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Container>
  );
}

export default Messages;