import { createContext, useContext, useEffect, useState } from "react";
import { createSocket } from "../socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) socket.disconnect();
      return;
    }

    const s = createSocket(token);

    s.on("connect", () => {
      s.emit("join", user.id); // join personal room
      console.log("🔌 Socket connected and joined room:", user.id);
    });

    // 👉 REAL-TIME NOTIFICATIONS
    s.on("notification", (note) => {
      console.log("🔔 Real-time notification received:", note);

      // (Later) εδώ θα:
      // - ενημερώσουμε unread badge,
      // - ίσως refetch notifications,
      // - ίσως ενημερώσουμε NotificationContext.
    });

    // 👉 REAL-TIME MESSAGES (global event)
    s.on("newMessage", (msg) => {
      console.log("💬 Real-time message received:", msg);
      // (Later) μπορούμε να το περάσουμε σε MessageContext ή Chat store
    });

    setSocket(s);

    return () => {
      s.off("notification");
      s.off("newMessage");
      s.disconnect();
    };
  }, [user?.id, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
