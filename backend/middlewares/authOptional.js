// middlewares/authOptional.js
const jwt = require("jsonwebtoken");

module.exports = (req, _res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    req.user = null;                  // public request
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // ίδιο shape με verifyToken
    req.user = { userId: decoded.userId, role: decoded.role };
  } catch (_err) {
    // Αν το token είναι άκυρο/expired, συνεχίζουμε ως public
    req.user = null;
  }

  return next();
};
