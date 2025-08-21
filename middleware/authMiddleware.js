const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    // req.user = { _id: decoded.id, email: decoded.email };
    req.userId = decoded.id; // <-- add this line
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
