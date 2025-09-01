const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) {
      req.user = { userId: user._id.toString(), role: user.role };
      req.currentUser = user;
    }
  } catch (err) {
    // ignore invalid token
  }
  return next();
};