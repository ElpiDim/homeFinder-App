// src/socket.js
import { io } from "socket.io-client";

const stripTrailingSlashes = (value = "") => String(value).replace(/\/+$/, "");

const resolveSocketBaseUrl = () => {
  const explicitBackend = stripTrailingSlashes(process.env.REACT_APP_BACKEND_URL);
  if (explicitBackend) return explicitBackend;

  const apiUrl = stripTrailingSlashes(process.env.REACT_APP_API_URL);
  if (apiUrl) {
    // REACT_APP_API_URL is often like https://host/api -> socket server is https://host
    return apiUrl.replace(/\/api$/i, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:5000";
};

export const createSocket = (token) => {
  const baseUrl = resolveSocketBaseUrl();

  return io(baseUrl, {
    // Keep polling fallback for environments where pure websocket upgrade fails.
    transports: ["websocket", "polling"],
    auth: { token },
  });
};
