// components/NotificationDropdown.js
import React from 'react';

function NotificationDropdown({ notifications, onClose }) {
  return (
    <div
      className="dropdown-menu show p-3 shadow"
      style={{
        position: 'absolute',
        top: '40px',
        right: '0',
        minWidth: '300px',
        zIndex: 999,
        backgroundColor: 'white',
        borderRadius: '8px'
      }}
    >
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Notifications</strong>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>×</button>
      </div>
      {notifications.length === 0 ? (
        <p className="mb-0 text-muted">No notifications</p>
      ) : (
        <ul className="list-unstyled mb-0">
          {notifications.map((note, idx) => (
            <li key={idx} className="border-bottom py-2">
              {(["favorite", "interest"].includes(note.type) && "Someone added your property to favorites.") ||
               (note.type === "property_removed" && "A property you have added to your favorites has been removed.") ||
               (note.type === "message" && "You have a new message.") ||
               (note.type === "appointment" && "you have a new appointment.") ||
               "Νέα ειδοποίηση."}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationDropdown;
