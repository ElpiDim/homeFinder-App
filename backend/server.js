// backend/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/app";

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let connectedUsers = {};

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("register", (userId) => {
    connectedUsers[userId] = socket.id;
    console.log("User registered", { userId, socketId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    for (let userId in connectedUsers) {
      if (connectedUsers[userId] === socket.id) {
        delete connectedUsers[userId];
        break;
      }
    }
  });
});

app.use((req, res, next) => {
  req.io = io;
  req.connectedUsers = connectedUsers;
  next();
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

    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
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
module.exports = { app, start };
