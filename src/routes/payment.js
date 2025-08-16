const express = require('express')
const auth = require('../middleware/authMiddleware')
const checkUsage = require('../middleware/checkUsage')
const axios = require("axios");

const router = express.Router()



// Initialize payment
router.post("/initialize", checkUsage, async (req, res) => {
  const { email } = req.user; 
  try {
    const response = await axios.post("https://api.paystack.co/transaction/initialize", {
      email,
      amount: 500000, // ₦5000 (in kobo)
      callback_url: "http://localhost:3000/payment-success",
    }, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response.data });
  }
});

// Verify payment
router.get("/verify/:reference", checkUsage, async (req, res) => {
  try {
    const { reference } = req.params;
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    });

    if (response.data.status && response.data.data.status === "success") {
      await User.findByIdAndUpdate(req.user.id, { plan: "pro" });
      return res.json({ success: true, plan: "pro" });
    }

    res.status(400).json({ success: false, message: "Payment not successful" });
  } catch (error) {
    res.status(500).json({ error: error.response.data });
  }
});

// routes/payments.js


router.post("/subscribe", authMiddleware, async (req, res) => {
  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount: 450000, // Paystack uses kobo (₦4,500 = 450000)
        callback_url: "http://localhost:3000/dashboard/billing/callback",
      },
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment initialization failed" });
  }
});



module.exports = router