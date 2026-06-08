const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require('../models/Users');
const sendWelcomeEmail = require('../utils/sendWelcomeEmail')
const Payments = require('../models/Payments')
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const Notification = require('../models/Notifications')



const router = express.Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 8, // limit each IP to 8 requests per window (login attempts)
    message: { message: 'Too many login attempts. Try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    // store: new RateLimitRedisStore({ sendCommand: (...args) => redisClient.call(...args) }) // optional
  });




router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, businessName, password, dialCode } = req.body;

    // Basic validation
    if (!name || !email || !phone || !businessName || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email or phone already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or phone already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user - ROLE IS HARDCODED TO 'user' FOR SECURITY
    const newUser = new User({
      name,
      email,
      phone: `${dialCode}${phone}`,
      businessName,
      passwordHash,
      role: 'user' // 🛡️ Force every new signup to be a standard user
    });

    await newUser.save();

    // 🔐 THE UPGRADE: Include 'role' in the JWT payload
    const token = jwt.sign(
      { 
        id: newUser._id, 
        email: newUser.email, 
        role: newUser.role, // Will be 'user'
        businessName: newUser.businessName 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Trigger the Welcome Intelligence
    await Notification.create({
      userId: newUser._id,
      type: 'SYSTEM',
      title: 'Welcome to QuickInvoice! 🚀',
      message: 'Your workspace is ready. You have 15 free invoice slots this month. Need help? Click "Manage Subscription" to see Pro benefits.',
      createdAt: new Date()
    });

    await sendWelcomeEmail(name, email, businessName);

    console.log(`${newUser.name} just signed up as a user`);

    res.status(201).json({
      message: "User registered successfully",
      token,
      role: newUser.role, // 🚦 Consistent with Login response
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        businessName: newUser.businessName,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});




router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.isFrozen) {
      return res.status(403).json({ message: "Account is frozen. Contact support." });
    }

    const isEnterpriseUser = user.plan === "enterprise";
    let finalTokenVersion = user.tokenVersion || 0;

    // 🚨 ATOMIC UPGRADE: Bypasses user.save() traps to guarantee database updates
    if (!isEnterpriseUser) {
      const updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $inc: { tokenVersion: 1 } }, // Atomically increment by 1 directly in MongoDB
        { new: true, runValidators: false } // Get the freshly updated document immediately
      );
      finalTokenVersion = updatedUser.tokenVersion;
    }

    // Sign the JWT with the precise version stored in the database
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role || 'user', 
        tokenVersion: finalTokenVersion, 
        businessName: user.businessName 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 🕵️‍♂️ DIAGNOSTIC LOG
   console.log(`${user.name} (${user.role || 'user'}) just logged in`);

    res.json({
      message: "Login successful",
      token,
      role: user.role || 'user', 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        businessName: user.businessName,
        role: user.role || 'user',
        plan: user.plan
      }
    }); 
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
