// src/context/NotificationContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import api from "api";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socket = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🔹 Φόρτωμα από API
  const fetchNotifications = useCallback(async () => {
    if (!user || !token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const res = await api.get("/notifications");
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list);
      // ΔΕΝ χρειάζεται εδώ setUnreadCount, θα γίνει από το useEffect πιο κάτω
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // 👉 Αρχικό load όταν αλλάζει χρήστης
  useEffect(() => {
    if (user && token) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, token, fetchNotifications]);

  // 🔁 Κάθε φορά που αλλάζει η λίστα, αναλογικά υπολόγισε το unreadCount
  useEffect(() => {
    const count = notifications.filter((n) => !n.read && !n.readAt).length;
    setUnreadCount(count);
  }, [notifications]);

  // 🔔 Socket listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleNotification = (note) => {
      console.log("🔔 Real-time notification via socket:", note);

      setNotifications((prev) => {
        const existsIndex = prev.findIndex((n) => n._id === note._id);
        if (existsIndex !== -1) {
          const copy = [...prev];
          copy[existsIndex] = note;
          return copy;
        }
        return [note, ...prev];
      });
      // ΔΕΝ αγγίζουμε setUnreadCount εδώ – θα το κάνει το useEffect πάνω
    };

    socket.on("notification", handleNotification);
    return () => {
      socket.off("notification", handleNotification);
    };
  }, [socket, user]);

  // 🔹 Mark single notification as read
  const markAsRead = useCallback(async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      const now = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, read: true, readAt: now } : n
        )
      );
      // Δεν κάνουμε setUnreadCount εδώ – πάλι θα το κάνει το useEffect
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }, []);

  // 🔹 Mark all as read
  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read && !n.readAt);
    if (!unread.length) return;

    try {
      await Promise.all(
        unread.map((n) => api.patch(`/notifications/${n._id}/read`))
      );
      const now = new Date().toISOString();

      setNotifications((prev) =>
        prev.map((n) =>
          unread.some((u) => u._id === n._id)
            ? { ...n, read: true, readAt: now }
            : n
        )
      );
      // Και πάλι, το useEffect θα ρίξει το unreadCount σε 0
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
