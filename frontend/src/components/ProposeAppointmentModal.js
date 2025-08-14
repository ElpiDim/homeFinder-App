import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";

function ProposeAppointmentModal({ show, onClose, tenantId, propertyId }) {
  const [slots, setSlots] = useState([""]); // ξεκινάμε με 1 πεδίο
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  // reset όταν κλείνει το modal
  useEffect(() => {
    if (!show) {
      setSlots([""]);
      setError("");
      setSubmitting(false);
    }
  }, [show]);

  const handleSlotChange = (index, value) => {
    setSlots(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const addSlot = () => setSlots(prev => [...prev, ""]);
  const removeSlot = (index) => setSlots(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // guard για διπλό click
    setSubmitting(true);
    setError("");

    // basic guards
    if (!tenantId || !propertyId) {
      setSubmitting(false);
      setError("Λείπουν tenantId ή propertyId.");
      return;
    }

    // Καθάρισμα/validation: future, dedupe, ISO
    const cleaned = Array.from(
      new Set(
        slots
          .map((s) => (s ? new Date(s) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()))
          .filter((d) => d.getTime() > Date.now())
          .map((d) => d.toISOString())
      )
    );

    if (cleaned.length === 0) {
      setSubmitting(false);
      setError("Πρόσθεσε τουλάχιστον μία μελλοντική ημερομηνία/ώρα.");
      return;
    }

    try {
      await axios.post(
        "/api/appointments/propose",
        { tenantId, propertyId, availableSlots: cleaned },
        { headers }
      );

      // Κλείσε το modal και ενημέρωσε τον parent ότι υποβλήθηκε επιτυχώς
      onClose?.(true);
      return; // σημαντικό: σταματά εδώ για να μην τρέξει το finally και ξανα-ανοίξει κάτι στον parent
    } catch (err) {
      console.error("Failed to propose appointment:", err);
      setError(err?.response?.data?.message || "Error sending proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={() => onClose?.(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Propose Appointment Slots</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <p className="small text-muted">
            Πρόσθεσε 1+ διαθέσιμες ώρες για να επιλέξει ο ενοικιαστής.
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
                  type="button"              // να ΜΗΝ είναι submit
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
            type="button"                  // να ΜΗΝ είναι submit
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
            type="button"                  // να ΜΗΝ είναι submit
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
