// backend/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ---------- Middleware ---------- */
app.use(cors());
app.use(express.json());

/* ---------- Health check ---------- */
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

/* ---------- Static uploads ---------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ---------- API Routes ---------- */
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const propertyRoutes = require("./routes/properties");
const favoritesRoutes = require("./routes/favorites");
const messageRoutes = require("./routes/messages");
const interestRoutes = require("./routes/interests");
const appointmentRoutes = require("./routes/appointments");
const notificationRoutes = require("./routes/notifications");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

/* ---------- Serve CRA build ---------- */
const clientDir = path.join(__dirname, "..", "frontend", "build");
app.use(express.static(clientDir));

// Catch-all για Ο,ΤΙ δεν είναι /api → δώσε το index.html (SPA routes)
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

/* ---------- 404 μόνο για API ---------- */
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

module.exports = app;
