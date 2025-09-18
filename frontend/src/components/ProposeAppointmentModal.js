import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import api from "../api";

function ProposeAppointmentModal({ show, onClose, tenantId, propertyId }) {
  const [slots, setSlots] = useState([""]); // ξεκινάμε με 1 πεδίο
  const [place, setPlace] = useState("At the property");
  const [note, setNote] = useState("Hi! Can we meet to view the property?");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // reset όταν κλείνει το modal
  useEffect(() => {
    if (!show) {
      setSlots([""]);
      setPlace("At the property");
      setNote("Hi! Can we meet to view the property?");
      setError("");
      setSubmitting(false);
    }
  }, [show]);

  const handleSlotChange = (index, value) => {
    setSlots((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const addSlot = () => setSlots((prev) => [...prev, ""]);
  const removeSlot = (index) =>
    setSlots((prev) => prev.filter((_, i) => i !== index));

  const cleanSlotsToISO = () => {
    return Array.from(
      new Set(
        slots
          .map((s) => (s ? new Date(s) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()))
          .filter((d) => d.getTime() > Date.now())
          .map((d) => d.toISOString())
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");

    if (!tenantId || !propertyId) {
      setSubmitting(false);
      setError("Missing tenantId or propertyId.");
      return;
    }

    const options = cleanSlotsToISO();
    if (options.length === 0) {
      setSubmitting(false);
      setError("Add at least one future date/time.");
      return;
    }

    // 1) Προσπάθησε το πιο “χαλαρό” endpoint: /appointments
    try {
      await api.post(
        "/appointments",
        {
          receiverId: tenantId,   // ο άλλος χρήστης της συνομιλίας
          propertyId,
          options,                // λίστα ISO strings
          place,
          message: note,
        },
        { headers: { "Content-Type": "application/json" } }
      );
      onClose?.(true);
      return;
    } catch (err1) {
      const msg1 = err1?.response?.data?.message || "";
      // 2) Αν δεν υπάρχει/αποτυγχάνει, κάνε fallback στο /appointments/propose
      try {
        await api.post(
          "/appointments/propose",
          { tenantId, propertyId, availableSlots: options, place, message: note },
          { headers: { "Content-Type": "application/json" } }
        );
        onClose?.(true);
        return;
      } catch (err2) {
        const msg2 = err2?.response?.data?.message || msg1 || "Error sending proposal.";
        setError(msg2);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={() => onClose?.(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Schedule an Appointment</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <Form.Group className="mb-3">
            <Form.Label>Short note (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
              placeholder="A short note to the other person"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Place</Form.Label>
            <Form.Control
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              disabled={submitting}
              placeholder="e.g. At the property, or a café nearby"
            />
          </Form.Group>

          <p className="small text-muted mb-1">
            Add 1+ available dates for the other side to choose from:
          </p>

          {slots.map((slot, i) => (
            <div className="mb-3 d-flex align-items-center" key={i}>
              <Form.Control
                type="datetime-local"
                value={slot}
                onChange={(e) => handleSlotChange(i, e.target.value)}
                disabled={submitting}
              />
              {slots.length > 1 && (
                <Button
                  variant="outline-danger"
                  className="ms-2"
                  size="sm"
                  onClick={() => removeSlot(i)}
                  type="button"
                  disabled={submitting}
                >
                  ✕
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline-primary"
            onClick={addSlot}
            size="sm"
            type="button"
            disabled={submitting}
          >
            + Add another slot
          </Button>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => onClose?.(false)}
            disabled={submitting}
            type="button"
          >
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
