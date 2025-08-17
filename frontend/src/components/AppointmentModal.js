import React, { useEffect, useState } from "react";
import api from '../api';
import { Modal, Button } from "react-bootstrap";

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
  }, [appointmentId, token]); // ok για re-fetch όταν αλλάξει token

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setLoading(true);
    setError("");
    try {
      // ✅ σωστό path + method σύμφωνα με το backend
      await api.put(
        `/appointments/confirm/${appointmentId}`,
        { selectedSlot },     // ✅ στέλνουμε το original string
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
    <Modal show onHide={() => onClose?.()} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {appointment ? "Choose Appointment Slot" : "Loading Appointment..."}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {fetching ? (
          <p className="text-muted mb-0">Loading…</p>
        ) : error ? (
          <div className="alert alert-danger mb-0">{error}</div>
        ) : !appointment ? (
          <p className="text-muted mb-0">Not found.</p>
        ) : appointment.status === "confirmed" ? (
          <p className="text-success">
            ✅ Already confirmed for{" "}
            <strong>{new Date(appointment.selectedSlot).toLocaleString()}</strong>
          </p>
        ) : (
          <>
            <p>Select one of the proposed times:</p>
            {!appointment.availableSlots?.length ? (
              <p className="text-muted mb-0">No proposed times yet.</p>
            ) : (
              <ul className="list-unstyled">
                {appointment.availableSlots.map((slot, idx) => (
                  <li key={idx} className="mb-2">
                    <label>
                      <input
                        type="radio"
                        name="slot"
                        value={slot}                 // ✅ original value
                        checked={selectedSlot === slot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="me-2"
                      />
                      {new Date(slot).toLocaleString()} {/* μόνο για εμφάνιση */}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={() => onClose?.()}>
          Cancel
        </Button>
        {appointment && appointment.status !== "confirmed" && (
          <Button
            variant="primary"
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
