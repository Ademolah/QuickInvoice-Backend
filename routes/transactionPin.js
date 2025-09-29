const express = require("express");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/Users");
const router = express.Router();







router.post("/set-transaction-pin", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "Transaction PIN must be 4 digits" });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);
    user.transactionPin = hashedPin;
    await user.save();
    res.json({ message: "Transaction PIN set successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



router.put("/update-transaction-pin", authMiddleware, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;

    if (!oldPin || !newPin) return res.status(400).json({ message: "Pins are required" });
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "New PIN must be 4 digits" });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    const isMatch = await bcrypt.compare(oldPin, user.transactionPin);
    if (!isMatch) return res.status(400).json({ message: "Old PIN is incorrect" });
    const salt = await bcrypt.genSalt(10);
    const hashedNewPin = await bcrypt.hash(newPin, salt);
    user.transactionPin = hashedNewPin;
    await user.save();
    res.json({ message: "Transaction PIN updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;