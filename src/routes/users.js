const express = require('express');
const User = require('../models/Users'); // Assuming you have a User model
const auth = require('../middleware/authMiddleware');
const { updateAccountDetails } = require('../controllers/usersController')
const {changePassword} = require('../controllers/usersController')


const router = express.Router();

// Get current logged-in user info
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('businessName email');
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


router.put('/account-details', auth, updateAccountDetails);
router.put('/change-password', auth, changePassword);

module.exports = router;
