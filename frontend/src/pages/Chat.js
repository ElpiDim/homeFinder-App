// src/pages/Chat.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMessages } from "../context/MessageContext";
import { useSocket } from "../context/SocketContext";
import api from "../api";
import Logo from "../components/Logo";
import { getMessages, sendMessage } from "../services/messagesService";
import { proposeAppointment } from "../services/appointmentsService";
import { Modal, Form, InputGroup, Alert } from "react-bootstrap";
import "./Chat.css";

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

function formatMsgTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Chat() {
  const { propertyId, userId: receiverId } = useParams();
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();

  const {
    conversations,
    unreadChats,
    loading,
    fetchConversations,
    markConversationAsRead,
  } = useMessages();

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // all | unread | clients

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [property, setProperty] = useState(null);
  const [otherUser, setOtherUser] = useState(null);

  const messagesEndRef = useRef(null);

  // ----- Propose appointment state -----
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [slotInputs, setSlotInputs] = useState([""]);
  const [proposalError, setProposalError] = useState("");
  const [proposalSuccess, setProposalSuccess] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const profileImg = user?.profilePicture
    ? user.profilePicture.startsWith("http")
      ? user.profilePicture
      : `${API_ORIGIN}${normalizeUploadPath(user.profilePicture)}`
    : "/default-avatar.jpg";

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // load property + other user info
  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const [propRes, userRes] = await Promise.all([
          api.get(`/properties/${propertyId}`),
          api.get(`/users/${receiverId}`),
        ]);
        if (ignore) return;
        setProperty(propRes.data || null);
        setOtherUser(userRes.data || null);
      } catch (e) {
        if (ignore) return;
        // fallback: other user from messages
        try {
          const all = await getMessages();
          const filtered = all
            .filter(
              (msg) =>
                msg.propertyId?._id === propertyId &&
                ((msg.senderId?._id === user.id &&
                  msg.receiverId?._id === receiverId) ||
                  (msg.senderId?._id === receiverId &&
                    msg.receiverId?._id === user.id))
            )
            .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

          if (ignore) return;
          const participant = filtered
            .map((msg) =>
              msg.senderId?._id === user.id ? msg.receiverId : msg.senderId
            )
            .find(Boolean);

          setOtherUser(participant || null);
        } catch {}
      }
    }

    if (token) load();
    return () => {
      ignore = true;
    };
  }, [token, propertyId, receiverId, user?.id]);

  // load messages
  useEffect(() => {
    const fetchMessagesForChat = async () => {
      try {
        const all = await getMessages();
        const filtered = all
          .filter(
            (msg) =>
              msg.propertyId?._id === propertyId &&
              ((msg.senderId?._id === user.id &&
                msg.receiverId?._id === receiverId) ||
                (msg.senderId?._id === receiverId &&
                  msg.receiverId?._id === user.id))
          )
          .sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));

        setMessages(filtered);

        const participant = filtered
          .map((msg) =>
            msg.senderId?._id === user.id ? msg.receiverId : msg.senderId
          )
          .find(Boolean);

        if (participant) setOtherUser(participant);
      } catch (err) {
        console.error("Failed to load messages", err);
      }
    };

    if (token) fetchMessagesForChat();
  }, [propertyId, receiverId, token, user.id]);

  // mark as read
  useEffect(() => {
    if (!user?.id || !propertyId || !receiverId) return;
    markConversationAsRead(propertyId, receiverId);
  }, [user?.id, propertyId, receiverId, markConversationAsRead]);

  // socket new message
  useEffect(() => {
    if (!user?.id || !socket) return;

    const handleNewMessage = (m) => {
      const ok =
        m.propertyId?._id === propertyId &&
        ((m.senderId?._id === user.id &&
          m.receiverId?._id === receiverId) ||
          (m.senderId?._id === receiverId &&
            m.receiverId?._id === user.id));
      if (!ok) return;

      setMessages((prev) => {
        if (m?._id && prev.some((x) => x._id === m._id)) return prev;
        return [...prev, m];
      });

      const receiver = m.receiverId?._id || m.receiverId;
      if (receiver && String(receiver) === String(user.id)) {
        markConversationAsRead(propertyId, receiverId);
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [socket, propertyId, receiverId, user?.id, markConversationAsRead]);

  // scroll bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const saved = await sendMessage(receiverId, propertyId, newMessage.trim());
      setMessages((prev) => {
        if (saved?._id && prev.some((x) => x._id === saved._id)) return prev;
        return [...prev, saved];
      });
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = Array.isArray(conversations) ? conversations : [];

    if (tab === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);

    if (!q) return list;

    return list.filter(({ property, otherUser, lastMessage }) => {
      const a = (otherUser?.name || "").toLowerCase();
      const b = (property?.title || property?.address || "").toLowerCase();
      const c = (property?.location || property?.city || "").toLowerCase();
      const d = (lastMessage?.content || "").toLowerCase();
      return a.includes(q) || b.includes(q) || c.includes(q) || d.includes(q);
    });
  }, [conversations, query, tab]);

  const openConversation = (pid, ouid) => {
    markConversationAsRead(pid, ouid);
    navigate(`/chat/${pid}/${ouid}`);
  };

  const otherAvatar = otherUser?.profilePicture
    ? assetUrl(otherUser.profilePicture, "/default-avatar.jpg")
    : "/default-avatar.jpg";

  const propImage = property?.images?.[0]
    ? assetUrl(property.images[0], "https://placehold.co/420x280?text=No+Image")
    : "https://placehold.co/420x280?text=No+Image";

  const propTitle = property?.title || "Property details";
  const propAddr = property?.address || property?.location || property?.city || "";
  const propPrice = property?.price
    ? `${property.price.toLocaleString?.() ?? property.price}`
    : "";
  const propType =
    property?.type === "rent"
      ? "For Rent"
      : property?.type === "sale"
      ? "For Sale"
      : "";
  const propStatus = property?.status || "";

  // ----- Propose appointment logic (owner only) -----
  const isOwnerOfProperty = useMemo(() => {
    if (!user || user.role !== "owner" || !property) return false;
    const ownerId = property?.ownerId?._id || property?.ownerId;
    return ownerId && String(ownerId) === String(user.id);
  }, [property, user]);

  const canProposeAppointment = useMemo(() => {
    return (
      isOwnerOfProperty &&
      receiverId &&
      user?.id &&
      String(receiverId) !== String(user.id)
    );
  }, [isOwnerOfProperty, receiverId, user?.id]);

  const openPropose = () => {
    setProposalError("");
    setProposalSuccess("");
    setSlotInputs([""]);
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
      if (!propertyId || !receiverId) {
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
        propertyId,
        tenantId: receiverId,
        availableSlots: normalizedSlots,
      });

      setProposalSuccess(
        `Sent ${normalizedSlots.length} option${
          normalizedSlots.length > 1 ? "s" : ""
        } to ${otherUser?.name || "the tenant"}.`
      );

      setShowProposalModal(false);
    } catch (err) {
      setProposalError(
        err?.response?.data?.message || "Failed to propose appointment slots."
      );
    } finally {
      setSubmittingProposal(false);
    }
  };

  return (
    <div className="cp-shell">
      {/* top header */}
      <header className="cp-top">
        <div className="cp-top-left">
          <Link to="/dashboard" className="cp-brand">
            <Logo as="h5" className="mb-0 logo-in-nav" />
          </Link>
          <nav className="cp-nav">
            <Link className="cp-toplink" to="/dashboard">
              Dashboard
            </Link>
            <Link className="cp-toplink" to="/my-properties">
              Properties
            </Link>
            <Link className="cp-toplink cp-toplink-active" to="/messages">
              Messages
              {unreadChats > 0 && <span className="cp-dot-badge">{unreadChats}</span>}
            </Link>
            <Link className="cp-toplink" to="/calendar">
              Calendar
            </Link>
          </nav>
        </div>

        <div className="cp-top-right">
          <Link to="/notifications" className="cp-iconbtn" aria-label="notifications">
            <span className="material-symbols-outlined">notifications</span>
          </Link>
          <Link to="/profile" className="cp-avatarbtn" aria-label="profile">
            <img src={profileImg} alt="profile" />
          </Link>
          <button className="cp-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* 3-column layout */}
      <div className="cp-layout">
        {/* LEFT */}
        <aside className="cp-left">
          <div className="cp-search">
            <span className="material-symbols-outlined">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search client or address..."
            />
          </div>

          <div className="cp-tabs">
            <button
              className={`cp-tab ${tab === "all" ? "active" : ""}`}
              onClick={() => setTab("all")}
            >
              All
            </button>
            <button
              className={`cp-tab ${tab === "unread" ? "active" : ""}`}
              onClick={() => setTab("unread")}
            >
              Unread
            </button>
            <button
              className={`cp-tab ${tab === "clients" ? "active" : ""}`}
              onClick={() => setTab("clients")}
            >
              Clients
            </button>
          </div>

          <div className="cp-list">
            {loading ? (
              <div className="cp-empty">Loading…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="cp-empty">No conversations yet.</div>
            ) : (
              filteredConversations.map(
                ({ property: p, otherUser: ou, lastMessage, unreadCount, conversationId }) => {
                  const key = conversationId || `${p?._id}-${ou?._id}`;
                  const avatar = assetUrl(ou?.profilePicture, "/default-avatar.jpg");
                  const active =
                    String(p?._id) === String(propertyId) && String(ou?._id) === String(receiverId);

                  return (
                    <button
                      type="button"
                      key={key}
                      className={`cp-row ${active ? "active" : ""}`}
                      onClick={() => openConversation(p._id, ou._id)}
                    >
                      <img className="cp-row-avatar" src={avatar} alt={ou?.name || "User"} />
                      <div className="cp-row-body">
                        <div className="cp-row-top">
                          <div className="cp-row-name">{ou?.name || "User"}</div>
                          <div className="cp-row-time">{timeAgo(lastMessage?.timeStamp)}</div>
                        </div>
                        <div className="cp-row-mid">
                          <div className="cp-row-prop">{p?.title || p?.address || "Property"}</div>
                          {(unreadCount || 0) > 0 && <span className="cp-unread-dot" />}
                        </div>
                        <div className="cp-row-msg">{lastMessage?.content || ""}</div>
                      </div>
                    </button>
                  );
                }
              )
            )}
          </div>
        </aside>

        {/* CENTER */}
        <main className="cp-center">
          <div className="cp-chatHead">
            <div className="cp-chatUser">
              <img className="cp-chatAvatar" src={otherAvatar} alt={otherUser?.name || "User"} />
              <div>
                <div className="cp-chatName">{otherUser?.name || "Conversation"}</div>
                <div className="cp-chatSub">
                  Inquiry for <span className="cp-linkish">{property?.title || "a listing"}</span>
                </div>
              </div>
            </div>

            <div className="cp-chatActions">
              {canProposeAppointment && (
                <button
                  type="button"
                  className="chat-propose-btn"
                  onClick={openPropose}
                  disabled={!property || submittingProposal}
                >
                  <span className="material-symbols-outlined">calendar_add_on</span>
                  Propose appointment
                </button>
              )}

              <button
                className="cp-btn"
                type="button"
                onClick={() => navigate(`/property/${propertyId}`)}
              >
                <span className="material-symbols-outlined">visibility</span>
                View Listing
              </button>

              <button className="cp-iconbtn" type="button" aria-label="more">
                <span className="material-symbols-outlined">more_vert</span>
              </button>
            </div>
          </div>

          <div className="cp-chatBody">
            <div className="cp-dayPill">Today</div>

            {messages.map((m) => {
              const isSelf = String(m.senderId?._id) === String(user.id);
              return (
                <div key={m._id} className={`cp-msgRow ${isSelf ? "self" : "other"}`}>
                  {!isSelf && <img className="cp-msgAvatar" src={otherAvatar} alt="avatar" />}

                  <div className={`cp-bubble ${isSelf ? "self" : "other"}`}>
                    <div className="cp-bubbleText">{m.content}</div>
                    <div className="cp-bubbleTime">{formatMsgTime(m.timeStamp)}</div>
                  </div>

                  {isSelf && <img className="cp-msgAvatar" src={profileImg} alt="me" />}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="cp-chatInput" onSubmit={handleSend}>
            <button type="button" className="cp-plus" aria-label="attach">
              <span className="material-symbols-outlined">add</span>
            </button>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <button type="button" className="cp-emoji" aria-label="emoji">
              <span className="material-symbols-outlined">sentiment_satisfied</span>
            </button>
            <button type="submit" className="cp-send" aria-label="send">
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </main>

        {/* RIGHT */}
        <aside className="cp-right">
          <div className="cp-rightTitle">PROPERTY DETAILS</div>

          <div className="cp-propCard">
            <div className="cp-propImg">
              <img src={propImage} alt={propTitle} />
              {propType && <span className="cp-propTag">{propType}</span>}
            </div>

            <div className="cp-propBody">
              <div className="cp-propName">{propTitle}</div>
              <div className="cp-propAddr">{propAddr}</div>

              <div className="cp-propRow">
                <div className="cp-propPrice">
                  {propPrice ? (
                    <>
                      <span className="cp-propPriceMain">${propPrice}</span>
                      {property?.type === "rent" && <span className="cp-propPriceSub">/mo</span>}
                    </>
                  ) : (
                    <span className="cp-propPriceMain">—</span>
                  )}
                </div>

                {propStatus && (
                  <span
                    className={`cp-status ${
                      String(propStatus).toLowerCase() === "available" ? "ok" : "muted"
                    }`}
                  >
                    {propStatus}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="cp-block">
            <div className="cp-blockTitle">SHARED FILES</div>
            <div className="cp-file">
              <div className="cp-fileIc pdf">PDF</div>
              <div className="cp-fileMeta">
                <div className="cp-fileName">Lease_Agreement.pdf</div>
                <div className="cp-fileSub">2.4 MB • 2 days ago</div>
              </div>
            </div>
            <div className="cp-file">
              <div className="cp-fileIc img">IMG</div>
              <div className="cp-fileMeta">
                <div className="cp-fileName">Kitchen_Renovation.jpg</div>
                <div className="cp-fileSub">4.1 MB • Today</div>
              </div>
            </div>
          </div>

          <div className="cp-block">
            <div className="cp-blockTitle">PARTICIPANTS</div>
            <div className="cp-part">
              <img src={profileImg} alt="me" />
              <div>
                <div className="cp-partName">You</div>
                <div className="cp-partRole">
                  {user?.role === "owner" ? "Property Owner" : "Client"}
                </div>
              </div>
            </div>
            <div className="cp-part">
              <img src={otherAvatar} alt="other" />
              <div>
                <div className="cp-partName">{otherUser?.name || "User"}</div>
                <div className="cp-partRole">Potential Tenant</div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Propose Appointment Modal */}
      <Modal show={showProposalModal} onHide={() => setShowProposalModal(false)} centered>
        <Form onSubmit={handlePropose}>
          <Modal.Header closeButton>
            <Modal.Title>Propose appointment times</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p className="text-muted mb-3">
              Suggest one or more date/time options for{" "}
              <strong>{otherUser?.name || "the tenant"}</strong>.
            </p>

            {proposalError && (
              <Alert variant="danger" onClose={() => setProposalError("")} dismissible>
                {proposalError}
              </Alert>
            )}

            {proposalSuccess && (
              <Alert variant="success" onClose={() => setProposalSuccess("")} dismissible>
                {proposalSuccess}
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
                  >
                    Remove
                  </button>
                )}
              </InputGroup>
            ))}

            <button type="button" className="btn btn-outline-primary" onClick={handleAddSlot}>
              Add another option
            </button>
          </Modal.Body>

          <Modal.Footer>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowProposalModal(false)}
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
  );
}
