// src/pages/Messages.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import ClientNavLayout from "../components/ClientNavLayout";
import "./Messages.css";
import api from "../api";
import { useMessages } from "../context/MessageContext";
import { proposeAppointment } from "../services/appointmentsService";
import { Form, InputGroup, Modal, Alert } from "react-bootstrap";

const API_ORIGIN =
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/+$/, "")
    : "") || (typeof window !== "undefined" ? window.location.origin : "");

function normalizeUploadPath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  const clean = src.replace(/^\/+/, "");
  return clean.startsWith("uploads/") ? `/${clean}` : `/uploads/${clean}`;
}

const assetUrl = (src, fallback) => {
  if (!src) return fallback;
  if (src.startsWith("http")) return src;
  return `${API_ORIGIN}${normalizeUploadPath(src)}`;
};

function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function Messages() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { conversations, unreadChats, loading, fetchConversations, markConversationAsRead } =
    useMessages();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // all | unread | clients

  // ✅ Propose appointment state (MUST be inside component)
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalContext, setProposalContext] = useState(null);
  // { propertyId, tenantId, tenantName, propertyTitle }
  const [slotInputs, setSlotInputs] = useState([""]);
  const [proposalError, setProposalError] = useState("");
  const [proposalSuccess, setProposalSuccess] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);


  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleConversationClick = (propertyId, otherUserId) => {
    markConversationAsRead(propertyId, otherUserId);
    navigate(`/chat/${propertyId}/${otherUserId}`);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.isArray(conversations) ? conversations : [];

    if (tab === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);
    // tab === "clients": κρατάμε ίδιο list (αν θες φιλτράρισμα by role, πρέπει να έρχεται από backend)
    if (!q) return list;

    return list.filter(({ property, otherUser, lastMessage }) => {
      const a = (otherUser?.name || "").toLowerCase();
      const b = (property?.title || property?.address || "").toLowerCase();
      const c = (property?.location || property?.city || "").toLowerCase();
      const d = (lastMessage?.content || "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q);
    });
  }, [conversations, query, tab]);

  // ---------- Propose appointment helpers ----------
  const resetProposalState = useCallback(() => {
    setSlotInputs([""]);
    setProposalError("");
    setProposalSuccess("");
    setSubmittingProposal(false);
    setProposalContext(null);
  }, []);

  const openProposeModal = ({ propertyId, tenantId, tenantName, propertyTitle }) => {
    setProposalError("");
    setProposalSuccess("");
    setSlotInputs([""]);
    setProposalContext({ propertyId, tenantId, tenantName, propertyTitle });
    setShowProposalModal(true);
  };

  const handleProposalSlotChange = (index, value) => {
    setSlotInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddSlot = () => setSlotInputs((prev) => [...prev, ""]);

  const handleRemoveSlot = (index) => {
    setSlotInputs((prev) => {
      if (prev.length === 1) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [""];
    });
  };

  const handlePropose = async (e) => {
    e.preventDefault();
    setProposalError("");
    setSubmittingProposal(true);

    try {
      if (!proposalContext?.propertyId || !proposalContext?.tenantId) {
        setProposalError("Missing conversation context.");
        setSubmittingProposal(false);
        return;
      }

      const normalizedSlots = slotInputs
        .map((slot) => (slot ? new Date(slot) : null))
        .filter((d) => d && !Number.isNaN(d.getTime()))
        .map((d) => d.toISOString());

      if (!normalizedSlots.length) {
        setProposalError("Please add at least one valid date and time.");
        setSubmittingProposal(false);
        return;
      }

      await proposeAppointment({
        propertyId: proposalContext.propertyId,
        tenantId: proposalContext.tenantId,
        availableSlots: normalizedSlots,
      });

      setProposalSuccess(
        `Sent ${normalizedSlots.length} option${
          normalizedSlots.length > 1 ? "s" : ""
        } to ${proposalContext.tenantName || "the tenant"}.`
      );

      setShowProposalModal(false);
      // κρατάμε success στο state αν θες να το δείχνεις σε toast — εδώ απλά κλείνει
    } catch (err) {
      setProposalError(err?.response?.data?.message || "Failed to propose appointment slots.");
    } finally {
      setSubmittingProposal(false);
    }
  };

  return (
    <ClientNavLayout
      title="Messages"
      subtitle="Chat with owners and agents"
      headerActions={
        <button className="ms-logout" onClick={handleLogout}>Logout</button>
      }
    >
      <div className="ms-shell">
        <div className="ms-page">
        <aside className="ms-left">
          <div className="ms-search">
            <span className="material-symbols-outlined">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or address..."
            />
          </div>

          <div className="ms-tabs">
            <button className={`ms-tab ${tab === "all" ? "active" : ""}`} onClick={() => setTab("all")}>
              All
            </button>
            <button
              className={`ms-tab ${tab === "unread" ? "active" : ""}`}
              onClick={() => setTab("unread")}
            >
              Unread
            </button>
            <button
              className={`ms-tab ${tab === "clients" ? "active" : ""}`}
              onClick={() => setTab("clients")}
            >
              Clients
            </button>
          </div>

          <div className="ms-list">
            {loading ? (
              <div className="ms-empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="ms-empty">No conversations yet.</div>
            ) : (
              filtered.map(({ property, otherUser, lastMessage, unreadCount, conversationId }) => {
                const key = conversationId || `${property?._id}-${otherUser?._id}`;
                const otherAvatar = assetUrl(otherUser?.profilePicture, "/default-avatar.jpg");

                const isOwner = user?.role === "owner";
                // ✅ only owners can propose (and only if other side exists)
                const canProposeHere = isOwner && property?._id && otherUser?._id;

                return (
                  <div key={key} className="ms-rowWrap">
                    <button
                      className="ms-row"
                      onClick={() => handleConversationClick(property._id, otherUser._id)}
                      type="button"
                    >
                      <img className="ms-row-avatar" src={otherAvatar} alt={otherUser?.name || "User"} />
                      <div className="ms-row-body">
                        <div className="ms-row-top">
                          <div className="ms-row-name">{otherUser?.name || "User"}</div>
                          <div className="ms-row-time">{timeAgo(lastMessage?.timeStamp)}</div>
                        </div>

                        <div className="ms-row-mid">
                          <div className="ms-row-prop">
                            {property?.title || property?.address || "Property"}
                          </div>
                          {(unreadCount || 0) > 0 && <span className="ms-unread-dot" />}
                        </div>

                        <div className="ms-row-msg">{lastMessage?.content || ""}</div>
                      </div>
                    </button>

                    {/* ✅ Optional inline button (owner only) */}
                    {canProposeHere && (
                      <button
                        type="button"
                        className="ms-propose"
                        onClick={() =>
                          openProposeModal({
                            propertyId: property._id,
                            tenantId: otherUser._id,
                            tenantName: otherUser?.name,
                            propertyTitle: property?.title || property?.address || "Property",
                          })
                        }
                        title="Propose an appointment"
                      >
                        <span className="material-symbols-outlined">calendar_add_on</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="ms-center-empty">
          <div className="ms-placeholder">
            <div className="ms-placeholder-title">Select a conversation</div>
            <div className="ms-placeholder-sub">Choose a chat from the left to view messages.</div>
          </div>
        </main>

        <aside className="ms-right-empty" />
      </div>

      {/* ✅ Propose Appointment Modal */}
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
            <p className="text-muted mb-3">
              Suggest one or more date/time options for{" "}
              <strong>{proposalContext?.tenantName || "the tenant"}</strong>
              {proposalContext?.propertyTitle ? (
                <>
                  {" "}
                  about <strong>{proposalContext.propertyTitle}</strong>.
                </>
              ) : (
                "."
              )}
            </p>

            {proposalError && (
              <Alert variant="danger" onClose={() => setProposalError("")} dismissible>
                {proposalError}
              </Alert>
            )}

            {slotInputs.map((slot, index) => (
              <InputGroup className="mb-2" key={`slot-${index}`}>
                <Form.Control
                  type="datetime-local"
                  value={slot}
                  onChange={(e) => handleProposalSlotChange(index, e.target.value)}
                  required
                />
                {slotInputs.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => handleRemoveSlot(index)}
                    disabled={submittingProposal}
                  >
                    Remove
                  </button>
                )}
              </InputGroup>
            ))}

            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleAddSlot}
              disabled={submittingProposal}
            >
              Add another option
            </button>
          </Modal.Body>

          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowProposalModal(false);
                resetProposalState();
              }}
              disabled={submittingProposal}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={submittingProposal}>
              {submittingProposal ? "Sending…" : "Send proposal"}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
    </ClientNavLayout>
  );
}
