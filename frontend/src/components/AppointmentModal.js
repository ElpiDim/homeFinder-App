import React, { useEffect, useState } from "react";
import axios from "axios";
import { Modal, Button } from "react-bootstrap";

function AppointmentModal({ appointmentId, onClose }) {
  const [appointment, setAppointment] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await axios.get(`/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAppointment(res.data);
      } catch (err) {
        console.error("Error fetching appointment:", err);
      } finally {
        setFetching(false);
      }
    };

    if (appointmentId) {
      fetchAppointment();
    }
  }, [appointmentId, token]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await axios.put(
        `/api/appointments/confirm/${appointmentId}`,
        { selectedSlot },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      alert("Appointment confirmed!");
      onClose();
    } catch (err) {
      console.error("Confirm error:", err);
      alert("Failed to confirm appointment.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {appointment ? "Choose Appointment Slot" : "Loading Appointment..."}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {appointment ? (
          appointment.status === "confirmed" ? (
            <p className="text-success">
              ✅ This appointment is already confirmed for:{" "}
              <strong>
                {new Date(appointment.selectedSlot).toLocaleString()}
              </strong>
            </p>
          ) : (
            <>
              <p>Select one of the proposed times:</p>
              <ul className="list-unstyled">
                {appointment.availableSlots.map((slot, idx) => (
                  <li key={idx} className="mb-2">
                    <label>
                      <input
                        type="radio"
                        name="slot"
                        value={slot}
                        checked={selectedSlot === slot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="me-2"
                      />
                      {new Date(slot).toLocaleString()}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )
        ) : (
    
            <p>Loading...</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
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
