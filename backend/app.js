// backend/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const app = express();
const rateLimit = require("express-rate-limit");

/*---- Allowed Origins---- */ 
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
].filter(Boolean);

app.set("trust proxy", 1);
/* ---------- Middleware ---------- */
/* ---------- Middleware ---------- */
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      const cleanOrigin = String(origin).replace(/\/$/, ""); // remove trailing /
      const ok = allowedOrigins.map((o) => String(o).replace(/\/$/, "")).includes(cleanOrigin);

      if (ok) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: false,
  })
);
app.use(helmet());

app.use(express.json());
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 requests
  message: {
    message: "Too many login attempts. Try again later."
  },
  standardHeaders: true,
  legacyHeaders: false
});
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

app.use("/api/auth", authLimiter, authRoutes);
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
