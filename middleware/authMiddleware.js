const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.isFrozen) {
      return res.status(403).json({ message: "Account is frozen. Contact support." });
    }

    // Single-device verification check
    if ((decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ message: "Session expired, please log in again" });
    }

    req.user = decoded; 
    req.userId = decoded.id; 

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
