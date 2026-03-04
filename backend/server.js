// backend/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/homefinder";

const server = http.createServer(app);

/**
 * ✅ Socket.IO CORS (locked down)
 * - supports localhost + optional FRONTEND_URL / FRONTEND_URL_STAGE (ngrok, vercel, etc.)
 */
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_STAGE,
].filter(Boolean);

// normalize helper (removes trailing slash)
const cleanOrigin = (o) => String(o || "").replace(/\/$/, "");

const allowedOriginsClean = allowedOrigins.map(cleanOrigin);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // allow non-browser clients / same-origin / server-to-server (no Origin header)
      if (!origin) return callback(null, true);

      const incoming = cleanOrigin(origin);

      if (allowedOriginsClean.includes(incoming)) return callback(null, true);

      return callback(
        new Error(`Socket.IO CORS blocked for origin: ${origin}`)
      );
    },
    methods: ["GET", "POST"],
    credentials: false, // keep false since you're using Authorization Bearer token (not cookies)
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;
    console.log(`Socket ${socket.id} joining room for user ${userId}`);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
  });
});

/**
 * Start HTTP server after connecting to Mongo.
 * - Σε test runs (NODE_ENV === 'test') ΔΕΝ ξεκινάμε αυτόματα.
 */
async function start() {
  try {
    // Μην συνδέεσαι σε πραγματική Mongo όταν τρέχουν tests με in-memory Mongo
    if (process.env.NODE_ENV !== "test") {
      await mongoose.connect(MONGO_URI);
      console.log("MongoDB connected");
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server listening on port ${PORT}`);
      console.log("Socket.IO allowed origins:", allowedOriginsClean);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Τρέξε μόνο όταν εκτελείς απευθείας το αρχείο (όχι στα tests)
if (require.main === module) {
  start();
}

// optionally exportables (χρήσιμα αν τα χρειαστείς)
module.exports = { app, start, server, io };