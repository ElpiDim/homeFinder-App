// backend/server.js
require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/app";

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

    app.listen(PORT, () => {
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
