function validateEnv() {
  const required = ["JWT_SECRET", "MONGO_URI", "GOOGLE_CLIENT_ID"];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((v) => console.error(`   - ${v}`));
    console.error("Server cannot start.");
    process.exit(1);
  }

  if (process.env.NODE_ENV === "production" && !process.env.FRONTEND_URL) {
    console.error("❌ FRONTEND_URL must be set in production");
    process.exit(1);
  }

  console.log("✅ Environment variables validated");
}

module.exports = validateEnv;
