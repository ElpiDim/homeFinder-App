// src/pages/Messages.js
import React, { useEffect, useState } from 'react';
import { getMessages, sendMessage } from '../services/messagesService';
import { Container, Card, Button, Form } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getMessages(token);
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages', err);
      }
    };

    fetchMessages();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      await sendMessage(receiverId, newMessage, token);
      setNewMessage('');
      alert('Message sent');
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <Container className="mt-4">
        <Button 
          variant="outline-secondary"
           className="mb-3"
            onClick={() => navigate('/dashboard')}>
              Back 
            </Button>
      <h3>Messages</h3>

      <Form onSubmit={handleSend} className="mb-4">
        <Form.Group className="mb-2">
          <Form.Label>Send to User ID</Form.Label>
          <Form.Control
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            required
          />
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Message</Form.Label>
          <Form.Control
            as="textarea"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            required
          />
        </Form.Group>

        <Button type="submit">Send</Button>
      </Form>

      {messages.length === 0 ? (
        <p>No messages yet</p>
      ) : (
        messages.map((msg) => (
          <Card key={msg._id} className="mb-3">
            <Card.Body>
              <Card.Title>From: {msg.senderId?.name || msg.senderId}</Card.Title>
              <Card.Text>{msg.content}</Card.Text>
              <Card.Text>
                <small>{new Date(msg.createdAt).toLocaleString()}</small>
              </Card.Text>
            </Card.Body>
          </Card>
        ))
      )}
    </Container>
  );
}

export default Messages;
