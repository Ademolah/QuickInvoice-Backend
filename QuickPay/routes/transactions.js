const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const Transaction = require("../../models/Transactions");
const bcrypt = require("bcrypt");
const User = require("../../models/Users");
const router = express.Router();
const axios = require("axios");


router.post("/verifyPin", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    // Basic validation
    if (!pin) {
      return res.status(400).json({ message: "PIN is required" });
    }

    // Frontend might send a number; convert to string
    const pinString = String(pin);
    
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.transactionPin) {
      return res.status(404).json({ message: "Transaction PIN not set, Set PIN in 'Settings' " });
    }

    
    const isMatch = await bcrypt.compare(pinString, user.transactionPin);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect PIN" });
    }

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


// GET /api/banks
router.get("/banks", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.sandbox.getanchor.co/api/v1/banks",
      {
        headers: {
          accept: "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY,
        },
      }
    );
    // Return the response from Anchor to the frontend
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error fetching banks from Anchor:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to fetch banks",
      error: error.response?.data || error.message,
    });
  }
});

//verify account

router.get("/verify-account/:bankCode/:accountNumber", authMiddleware, async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.params;
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        message: "bankCode and accountNumber are required",
      });
    }
    const url = `https://api.sandbox.getanchor.co/api/v1/payments/verify-account/${bankCode}/${accountNumber}`;
    const apiResponse = await axios.get(url, {
      headers: {
        accept: "application/json",
        "x-anchor-key": process.env.ANCHOR_API_KEY,
      },
    });
    // ✅ Return only relevant info to frontend
    return res.status(200).json({
      success: true,
      accountName: apiResponse.data?.data?.attributes?.accountName,
      bank: apiResponse.data?.data?.attributes?.bank?.name,
      accountNumber: apiResponse.data?.data?.attributes?.accountNumber,
    });
  } catch (error) {
    console.error(
      "Verify Account Error:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      message: "Error verifying account",
      error: error?.response?.data || error.message,
    });
  }
});

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 }) // newest first
      .select({
        transactionType: 1,
        transactionAmount: 1,
        transactionDetail: 1,
        accountBalance: 1,
        createdAt: 1,
      });
    return res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch transaction history",
    });
  }
});


module.exports = router;