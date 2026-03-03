// backend/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/*---- Allowed Origins---- */ 
 const allowedOrigins = [
  process.env.FRONTEND_URL,          // production
  //process.env.FRONTEND_URL_STAGE,    // staging (optional)
  "http://localhost:3000",           // local dev
].filter(Boolean);

/* ---------- Middleware ---------- */
/* ---------- Middleware ---------- */
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow server-to-server/no origin
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false, // keep false (Authorization header)
  })
);

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
const appointmentRoutes = require("./routes/appointments");
const notificationRoutes = require("./routes/notifications");

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", userRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

/* ---------- Serve React build ---------- */
app.use(express.static(path.join(__dirname, "build")));

// SPA fallback (everything except /api)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
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
