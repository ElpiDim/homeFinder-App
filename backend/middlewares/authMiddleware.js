const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔑 Χρησιμοποιούμε το userId που βάλαμε στο payload του token
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Βάζουμε στο req.user μόνο τα απαραίτητα
    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    // Αν χρειάζεται και πλήρες object, το κρατάμε σε ξεχωριστό property
    req.currentUser = user;

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
