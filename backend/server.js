// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

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
app.use("/api/users",userRoutes);
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
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

/* ---------- 404 μόνο για API ---------- */
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Not found" });
});

/* ---------- Error handler ---------- */
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

/* ---------- Start AFTER Mongo connects ---------- */
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    if (process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("mongodb connected");
    } else {
      console.warn("⚠️  Missing MONGO_URI in .env — starting without DB connection.");
    }

    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("mongo error", err);
    process.exit(1);
  }
})();
