import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMessages, sendMessage } from '../services/messagesService';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Button, Form, InputGroup } from 'react-bootstrap';

function Chat() {
  const { propertyId, userId: receiverId } = useParams();
  const { user, token} = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');


  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const allMessages = await getMessages();
        const filteredMessages = allMessages.filter(
          (msg) =>
            msg.propertyId?._id === propertyId &&
            ((msg.senderId?._id === user.id && msg.receiverId?._id === receiverId) ||
              (msg.senderId?._id === receiverId && msg.receiverId?._id === user.id))
        );
        setMessages(filteredMessages);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    if (token) {
      fetchMessages();
    }
  }, [propertyId, receiverId, token, user.id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await sendMessage(receiverId, propertyId, newMessage);
      setNewMessage('');
      // Refetch messages to show the new one
      const allMessages = await getMessages();
      const filteredMessages = allMessages.filter(
        (msg) =>
          msg.propertyId?._id === propertyId &&
          ((msg.senderId?._id === user.id && msg.receiverId?._id === receiverId) ||
            (msg.senderId?._id === receiverId && msg.receiverId?._id === user.id))
      );
      setMessages(filteredMessages);
      localStorage.setItem('lastMessageCheck', new Date().toISOString());
    } catch (err) {
      console.error('Failed to send message', err);
      alert('Failed to send message.');
    }
  };

  return (
    <Container className="mt-4">
      <Button
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate(-1)}
      >
        Back
      </Button>
      <h3>Conversation</h3>
      <Card>
        <Card.Body style={{ height: '400px', overflowY: 'auto' }}>
          {messages.map((msg) => (
            <div
              key={msg._id}
              className={`d-flex mb-2 ${
                msg.senderId?._id === user.id ? 'justify-content-end' : ''
              }`}
            >
              <div
                className={`p-2 rounded ${
                  msg.senderId?._id === user.id
                    ? 'bg-primary text-white'
                    : 'bg-light'
                }`}
              >
                <p className="mb-1">{msg.content}</p>
                <small className="text-muted">
                  {new Date(msg.timeStamp).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        </Card.Body>
        <Card.Footer>
          <Form onSubmit={handleSend}>
            <InputGroup>
              <Form.Control
                as="textarea"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                required
              />
              <Button type="submit">Send</Button>
            </InputGroup>
          </Form>
        </Card.Footer>
      </Card>
    </Container>
  );
}

export default Chat;
