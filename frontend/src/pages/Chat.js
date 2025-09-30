import React, { useState, useEffect, useMemo, useRef} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
} from 'react-bootstrap';
import api from '../api';
import { proposeAppointment } from '../services/appointmentsService';
import { io } from "socket.io-client";


function Chat() {
  const { propertyId, userId: receiverId } = useParams();
  const { user, token} = useAuth();
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
  const socket = useRef(null);
  const messagesEndRef = useRef(null);

  const SOCKET_URL = process.env.REACT_APP_API_URL || (typeof window !== 'undefined' ? window.location.origin : '');

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

  useEffect(() => {
    if (user?.id) {
      socket.current = io(SOCKET_URL, {
        reconnectionAttempts: 3,
        transports: ['websocket'],
      });
      socket.current.emit('join', user.id);

      socket.current.on('newMessage', (newMessage) => {
        if (
          newMessage.propertyId?._id === propertyId &&
          ((newMessage.senderId?._id === user.id && newMessage.receiverId?._id === receiverId) ||
           (newMessage.senderId?._id === receiverId && newMessage.receiverId?._id === user.id))
        ) {
          setMessages((prev) => [...prev, newMessage]);
        }
      });

      return () => {
        socket.current.disconnect();
      };
    }
  }, [user?.id, propertyId, receiverId, SOCKET_URL]);

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
      await sendMessage(receiverId, propertyId, newMessage);
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
          {propertyError && (
            <Alert variant="danger" className="mb-3">
              {propertyError}
            </Alert>
          )}
          {proposalSuccess && (
            <Alert
              variant="success"
              className="mb-3"
              onClose={() => setProposalSuccess('')}
              dismissible
            >
              {proposalSuccess}
            </Alert>
          )}
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
          <div ref={messagesEndRef} />
        </Card.Body>
        <Card.Footer>
          {canProposeAppointment && (
            <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
              <Button
                variant="success"
                onClick={() => {
                  setShowProposalModal(true);
                  setProposalError('');
                }}
                disabled={loadingProperty}
              >
                Propose appointment
              </Button>
            </div>
          )}
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
  );
}

export default Chat;
