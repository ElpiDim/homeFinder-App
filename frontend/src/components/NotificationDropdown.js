{/* Notifications Dropdown */}
<div ref={dropdownRef} className="position-relative">
  <button
    className="btn btn-link text-decoration-none text-dark p-0 position-relative"
    onClick={handleToggleNotifications}
  >
    Notifications
    {unreadCount > 0 && (
      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
        {unreadCount}
      </span>
    )}
  </button>

  {showNotifications && (
    <div
      className="position-absolute"
      style={{ top: '100%', right: 0, zIndex: 6000, width: 380, maxWidth: '86vw' }}
    >
      <div className="card shadow-sm notifications-card" style={{ fontSize: '0.95rem' }}>
        {/* Header */}
        <div className="card-header d-flex align-items-center" style={{ fontWeight: 600 }}>
          <span>Notifications</span>
          <div className="ms-auto d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={async () => {
                  const unread = notifications.filter(n => !n.read);
                  try {
                    await Promise.all(
                      unread.map(n =>
                        axios.patch(`/api/notifications/${n._id}/read`, {}, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                      )
                    );
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    setUnreadCount(0);
                  } catch (e) {
                    console.error("Mark all read failed", e);
                  }
                }}
              >
                Mark all as read
              </button>
            )}
            <button className="btn-close" onClick={() => setShowNotifications(false)} />
          </div>
        </div>

        {/* List */}
        <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <ul className="list-group list-group-flush">
            {(() => {
              const seen = new Set();
              const list = notifications.filter(n => {
                const id = n._id || `${n.type}-${n.referenceId}-${n.createdAt || ""}`;
                if (seen.has(id)) return false;
                seen.add(id);
                return true;
              });

              if (list.length === 0) {
                return (
                  <li className="list-group-item text-center text-muted py-4">
                    No notifications
                  </li>
                );
              }

              return list.map(note => {
                const isUnread = !note.read;
                const go = async () => {
                  if (isUnread) {
                    setNotifications(prev => prev.map(n => n._id === note._id ? { ...n, read: true } : n));
                    setUnreadCount(c => Math.max(0, c - 1));
                    try {
                      await axios.patch(`/api/notifications/${note._id}/read`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                    } catch (e) {
                      setNotifications(prev => prev.map(n => n._id === note._id ? { ...n, read: false } : n));
                      setUnreadCount(c => c + 1);
                    }
                  }

                  if (note.type === "interest") {
                    setSelectedInterestId(note.referenceId);
                    setShowNotifications(false);
                  } else if (note.type === "appointment") {
                    setSelectedAppointmentId(note.referenceId);
                    setShowNotifications(false);
                  } else if (note.referenceId) {
                    setShowNotifications(false);
                    navigate(`/property/${note.referenceId}`);
                  }
                };

                return (
                  <li
                    key={note._id}
                    className="list-group-item py-3 px-3 notification-item"
                    onClick={go}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="d-flex align-items-start">
                      <div
                        className="me-3 d-flex align-items-center justify-content-center"
                        style={{
                          width: 36, height: 36, borderRadius: 12,
                          background: 'rgba(13,110,253,.08)', fontSize: 18, flex: '0 0 36px'
                        }}
                      >
                        {iconForType(note.type)}
                      </div>

                      <div className="flex-grow-1">
                        <div className="d-flex">
                          <div style={{ lineHeight: 1.35, color: '#212529' }}>
                            {titleForNote(note)}
                          </div>
                          {isUnread && (
                            <span
                              className="ms-auto mt-1"
                              style={{
                                width: 8, height: 8, borderRadius: 9999,
                                background: '#dc3545', display: 'inline-block', flex: '0 0 auto'
                              }}
                              aria-label="unread"
                            />
                          )}
                        </div>
                        <div style={{ color: '#6c757d', marginTop: 4 }}>
                          {timeAgo(note.createdAt)}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              });
            })()}
          </ul>
        </div>

        {/* Footer (optional) */}
        <div className="card-footer bg-light text-center">
          <button
            className="btn btn-link text-decoration-none"
            onClick={() => { setShowNotifications(false); navigate('/notifications'); }}
          >
            View all
          </button>
        </div>
      </div>
    </div>
  )}
</div>
