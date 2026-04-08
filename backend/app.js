const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");

const app = express();

/* ---------- Allowed Origins ---------- */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_STAGE,
  "https://homefinder-app-fe.onrender.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000",
].filter(Boolean);

const cleanOrigin = (origin) => String(origin || "").replace(/\/$/, "");
const normalizedAllowedOrigins = allowedOrigins.map(cleanOrigin);

const corsOptions = {
  origin: (origin, cb) => {
    // allow Postman / server-to-server
    if (!origin) return cb(null, true);

    const incomingOrigin = cleanOrigin(origin);

    if (normalizedAllowedOrigins.includes(incomingOrigin)) {
      return cb(null, true);
    }

    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.set("trust proxy", 1);

/* ---------- Middleware ---------- */
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

app.use(helmet());
app.use(express.json());

/* ---------- Health check ---------- */
app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/* ---------- Static uploads (legacy only - safe to keep) ---------- */
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

/* ---------- 404 μόνο για API ---------- */
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  console.error("❌ Unhandled error:", err);

  if (res.headersSent) return;

  res.status(err.status || 500).json({
    message: err.message || "Server error",
  });
});

module.exports = app;