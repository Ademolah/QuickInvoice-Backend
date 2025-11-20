const express = require('express');
const User = require('../models/Users'); // Assuming you have a User model
const auth = require('../middleware/authMiddleware');
const { updateAccountDetails, updatePickupAddress } = require('../controllers/usersController')
const {changePassword} = require('../controllers/usersController')
const axios = require('axios')
const asyncHandler = require('express-async-handler')
const upload = require('../middleware/upload')
const cloudinary = require('../utils/cloudinary')
const trackActivity = require('../middleware/trackActivity')
const Transactions = require('../models/Transactions')


const router = express.Router();

// Get current logged-in user info
router.get('/me', auth,trackActivity, async (req, res) => {
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
router.get("/account-details", auth,trackActivity, async (req, res) => {
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

router.post('/avatar',auth,trackActivity, upload.single('image'),asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // Upload to Cloudinary via upload_stream to avoid writing to disk
    const bufferStreamUpload = (buffer) =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `quickinvoice_ng/avatars`, // optional folder
            transformation: [
              { width: 800, height: 800, crop: "limit" }, // limit size
              { quality: "auto" }
            ],
            format: 'png', // normalize format (optional)
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(buffer);
      });
    // If user already has a public id -> try deleting old image (best effort)
    if (user.avatarPublicId) {
      try {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      } catch (err) {
        console.warn('Failed to delete previous avatar from Cloudinary', err.message || err);
      }
    }
    // Upload new image
    const result = await bufferStreamUpload(req.file.buffer);
    // Save URL and public_id to user
    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
    await user.save();

    console.log(`Image uploaded successfully for ${user.name}`);
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatar: user.avatar,
      avatarPublicId: user.avatarPublicId,
    });
  })
);

router.put("/complete-profile" , auth,trackActivity, async (req, res)  => {
  try {
    // const userId = req.params.id;
    const userId = req.userId
    const { nationality, date_of_birth, residential_address, occupation } = req.body;
    // Validate input (optional strict validation)
    if (!nationality || !date_of_birth || !residential_address || !occupation ) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        nationality,
        date_of_birth,
        residential_address,
        occupation,
      },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
});


router.post("/verify-nin", auth,trackActivity, async (req, res) => {
  try {
    const { nin } = req.body;
    if (!nin) {
      return res.status(400).json({ message: "NIN is required" });
    }
    // Get the current logged-in user
    const userId = req.userId
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    // Call Dojah API
    const response = await axios.get(
      `${process.env.DOJAH_BASE_URL}/api/v1/kyc/nin/advance`,
      {
        headers: {
          AppId: process.env.DOJAH_APP_ID,
          Authorization: process.env.DOJAH_SECRET_KEY,
        },
        params: {
          nin,
        },
      }
    );
    const entity = response.data?.entity;
    if (!entity) {
      return res.status(500).json({ message: "Invalid response from verification provider" });
    }

    // Compare names (case-insensitive)
    const matchesFirstName =
      entity.first_name?.toLowerCase() === user.first_name?.toLowerCase();
    const matchesLastName =
      entity.last_name?.toLowerCase() === user.last_name?.toLowerCase();
    if (!matchesFirstName && !matchesLastName) {
      return res.status(400).json({ message: "Invalid NIN - Name mismatch", data: entity });
    }
    // ✅ Save to DB
    user.valid_NIN = nin;
    await user.save();
    return res.status(200).json({ success: true, message: "NIN verified successfully" });
  } catch (error) {
    console.error("NIN verification error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      message: "NIN verification failed",
      error: error.response?.data || null,
    });
  }
});

router.get("/fetchTransactions", auth, async (req, res) => {
  try {
    const userId = req.userId; // Provided by your middleware
    // Option 1: Count only
    const transactionCount = await Transactions.countDocuments({ user: userId });

    // Option 2: Get transaction list
    // const transactions = await Transactions.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      count: transactionCount
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;



router.put('/account-details', auth,trackActivity, updateAccountDetails);
router.put('/change-password', auth,trackActivity, changePassword);
router.put('/pickup-address', auth, trackActivity, updatePickupAddress)

module.exports = router;
