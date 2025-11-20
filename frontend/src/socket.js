// src/socket.js
import { io } from "socket.io-client";

export const createSocket = (token) => {
  return io(process.env.REACT_APP_BACKEND_URL || "http://localhost:5000", {
    transports: ["websocket"],
    auth: { token },
  });
};
