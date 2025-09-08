const jwt = require("jsonwebtoken");
const User = require("../models/user");

const verifyToken = async (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT decoded:', decoded); // 👈 δες userId/role


    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      console.log('No user for id:', decoded.userId);
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = { userId: user._id.toString(), role: user.role };
    req.currentUser = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};


module.exports = verifyToken;
