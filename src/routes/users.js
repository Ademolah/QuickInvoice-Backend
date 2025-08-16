const express = require('express');
const User = require('../models/Users'); // Assuming you have a User model
const auth = require('../middleware/authMiddleware');
const { updateAccountDetails } = require('../controllers/usersController')
const {changePassword} = require('../controllers/usersController')
const axios = require('axios')


const router = express.Router();

// Get current logged-in user info
router.get('/me', auth, async (req, res) => {
  try {
    // const user = await User.findById(req.user.id).select('businessName email');
    const user = await User.findById(req.user.id)
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// In your userRoutes.js or wherever your routes are defined
router.get("/account-details", auth, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming you have auth middleware
    const user = await User.findById(userId).select("accountDetails");
    // console.log(user);
    

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ accountDetails: user.accountDetails });
  } catch (error) {
    console.error("Error fetching bank details:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Initialize payment
router.post("/initialize", auth, async (req, res) => {
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
router.get("/verify/:reference", auth, async (req, res) => {
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



router.put('/account-details', auth, updateAccountDetails);
router.put('/change-password', auth, changePassword);

module.exports = router;
