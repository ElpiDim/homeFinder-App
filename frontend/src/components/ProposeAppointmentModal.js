import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";

function ProposeAppointmentModal({ show, onClose, tenantId, propertyId }) {
  const [slots, setSlots] = useState([""]);
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem("token");

  const handleSlotChange = (index, value) => {
    const updated = [...slots];
    updated[index] = value;
    setSlots(updated);
  };

  const addSlot = () => setSlots([...slots, ""]);
  const removeSlot = (index) => setSlots(slots.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

     const cleanSlots = slots
      .filter((s) => s && s.trim() !== "")
      .map((s) => new Date(s).toISOString());

    if (cleanSlots.length === 0) {
      alert("Please provide at least one time slot.");
      setSubmitting(false);
      return;
    }

    try {
      await axios.post(
        "/api/appointments/propose",
        {
          tenantId,
          propertyId,
          availableSlots: cleanSLots
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
      });
      onClose();
    } catch (err) {
      console.error("Failed to propose appointment:", err);
      alert("Error sending proposal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Propose Appointment Slots</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="small text-muted">
            Add 1–3 available time slots for the tenant to choose from.
          </p>

          {slots.map((slot, i) => (
            <div className="mb-3 d-flex align-items-center" key={i}>
              <Form.Control
                type="datetime-local"
                value={slot}
                onChange={(e) => handleSlotChange(i, e.target.value)}
                required
              />
              {slots.length > 1 && (
                <Button
                  variant="danger"
                  className="ms-2"
                  size="sm"
                  onClick={() => removeSlot(i)}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}

          {slots.length < 5 && (
            <Button variant="outline-primary" onClick={addSlot} size="sm">
              + Add another slot
            </Button>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Send Proposal"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default ProposeAppointmentModal;
