const jwt = require('jsonwebtoken');
const User = require('../models/Users')

// const protect = async (req, res, next) => {
//   let token;

//   if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
//     token = req.headers.authorization.split(" ")[1];
//   }

//   if (!token) {
//     return res.status(401).json({ message: "Not authorized, no token" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // { id, email };
//     req.userId = decoded.id; // <-- add this line


    
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: "Token failed" });
//   }
// };

// module.exports = protect;


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


    const user = await User.findById(decoded.id)

    if(!user){
      return res.status(401).json({message: "User not found"})
    }

    if(user.isFrozen){
      return res.status(403).json({ message: "Account is frozen. Contact support." });
    }


    //compare tokenVersion
    if(decoded.tokenVersion !== user.tokenVersion){
      return res.status(401).json({message: "Session expired, please log in again"})
    }


    req.user = decoded; // { id, email, tokenVersion };
    req.userId = decoded.id; // <-- add this line


    
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
