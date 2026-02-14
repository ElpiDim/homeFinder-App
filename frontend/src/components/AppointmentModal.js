import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import api from "../api";
import "./AppointmentModal.css";

function AppointmentModal({ appointmentId, onClose }) {
  const [appointment, setAppointment] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const headers = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const isConfirmed = appointment?.status === "confirmed" || Boolean(appointment?.selectedSlot);

  useEffect(() => {
    let alive = true;
    const fetchAppointment = async () => {
      setFetching(true);
      setError("");
      try {
        const res = await api.get(`/appointments/${appointmentId}`, { headers });
        if (!alive) return;
        setAppointment(res.data);
      } catch (err) {
        if (!alive) return;
        console.error("Error fetching appointment:", err);
        setError(err.response?.data?.message || "Failed to load appointment.");
      } finally {
        alive && setFetching(false);
      }
    };
    if (appointmentId) fetchAppointment();
    return () => { alive = false; };
  }, [appointmentId, token]);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setError("");
    try {
      await api.put(
        `/appointments/confirm/${appointmentId}`,
        { selectedSlot },
        { headers }
      );
      onClose?.(true);
    } catch (err) {
      console.error("Confirm error:", err);
      setError(err.response?.data?.message || "Failed to confirm appointment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      show
      onHide={() => onClose?.()}
      centered
      dialogClassName="appointment-modal-dialog"
      contentClassName="appointment-modal-content"
    >
      <Modal.Header closeButton className="appointment-modal-header">
        <div>
          <p className="appointment-modal-eyebrow">Appointments</p>
          <Modal.Title>
            {isConfirmed ? "Appointment Confirmed" : "Choose Appointment Slot"}
          </Modal.Title>
        </div>
      </Modal.Header>

      <Modal.Body className="appointment-modal-body">
        {fetching ? (
          <p className="text-muted mb-0">Loading…</p>
        ) : error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : !appointment ? (
          <p className="text-muted mb-0">Not found.</p>
        ) : appointment.status === "confirmed" ? (
          <p className="appointment-modal-confirmed mb-0">
            ✅ Already confirmed for{" "}
            <strong>{new Date(appointment.selectedSlot).toLocaleString()}</strong>
          </p>
        ) : (
          <>
            <p className="appointment-modal-helper">Select one of the proposed times:</p>
            {!appointment.availableSlots?.length ? (
              <p className="text-muted mb-0">No proposed times yet.</p>
            ) : (
              <ul className="appointment-slot-list list-unstyled">
                {appointment.availableSlots.map((slot, idx) => (
                  <li key={idx}>
                    <label className="appointment-slot-item">
                      <input
                        type="radio"
                        name="slot"
                        value={slot}
                        checked={selectedSlot === slot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="appointment-slot-radio"
                      />
                      <span>{new Date(slot).toLocaleString()}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer className="appointment-modal-footer">
        <Button variant="outline-secondary" className="rounded-pill px-4" onClick={() => onClose?.()}>
          Cancel
        </Button>
        {appointment && appointment.status !== "confirmed" && (
          <Button
            variant="primary"
            className="rounded-pill px-4"
            onClick={handleConfirm}
            disabled={!selectedSlot || loading}
          >
            {loading ? "Confirming..." : "Confirm Appointment"}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default AppointmentModal;
