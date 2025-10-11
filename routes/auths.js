const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/Users');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail')
const Payments = require('../models/Payments')
const axios = require("axios");
const rateLimit = require("express-rate-limit");


const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 8, // limit each IP to 8 requests per window (login attempts)
    message: { message: 'Too many login attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    // store: new RateLimitRedisStore({ sendCommand: (...args) => redisClient.call(...args) }) // optional
  });

// @desc    Register new user
// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, businessName, password } = req.body;

    // Basic validation
    if (!name || !email || !phone || !businessName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or phone already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      phone: `+234${req.body.phone}`,
      // phone: `${req.body.dialCode}${req.body.phone}`,
      businessName,
      passwordHash
    });

    await newUser.save();

    // Create JWT token
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "40m" }
    );
    


    await sendWelcomeEmail(name, email, businessName)

    console.log(`${newUser.name} just signed up` )
    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        businessName: newUser.businessName
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if(user.isFrozen){
      return res.status(403).json({ message: "Account is frozen. Contact support." });
    }

    // Create JWT token
    // const token = jwt.sign(
    //   { id: user._id, email: user.email },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "7d" }
    // );

    user.tokenVersion += 1;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET,
      { expiresIn: "40m" }
    );

    console.log(`${user.name} just logged in` )

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName
      }
    }); 
    // return
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




// router.post("/register", async (req, res) => {
//   try {
//     const { name, email, phone, businessName, password } = req.body;

//     // Basic validation
//     if (!name || !email || !phone || !businessName || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Check if email or phone already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingUser) {
//       return res.status(400).json({ message: "Email or phone already in use" });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const passwordHash = await bcrypt.hash(password, salt);

//     // Create user
//     const newUser = new User({
//       name,
//       email,
//       phone,
//       businessName,
//       passwordHash
//     });

//     await newUser.save();

//     // 🔹 Create placeholder subaccount for this user
//     const newPayment = new Payments({
//       user: newUser._id,
//       subaccountId: "placeholder-subaccount", // temporary ID
//       bank: "placeholder-bank",
//       account_number: "0000000000",
//       account_name: newUser.name,
//     });


//     await newPayment.save();

//     // Create JWT token
//     const token = jwt.sign(
//       { id: newUser._id, email: newUser.email },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     await sendWelcomeEmail(name, email, businessName);

//     console.log(`${newUser.name} just signed up`);
//     res.status(201).json({
//       message: "User registered successfully",
//       token,
//       user: {
//         id: newUser._id,
//         name: newUser.name,
//         email: newUser.email,
//         phone: newUser.phone,
//         businessName: newUser.businessName
//       }
//     });
//   } catch (error) {
//     console.error("Register error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });





module.exports = router;
