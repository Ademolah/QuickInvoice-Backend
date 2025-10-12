const express = require('express');
const User = require('../models/Users'); // Assuming you have a User model
const auth = require('../middleware/authMiddleware');
const { updateAccountDetails } = require('../controllers/usersController')
const {changePassword} = require('../controllers/usersController')
const axios = require('axios')
const asyncHandler = require('express-async-handler')
const upload = require('../middleware/upload')
const cloudinary = require('../utils/cloudinary')
const trackActivity = require('../middleware/trackActivity')


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



router.put('/account-details', auth,trackActivity, updateAccountDetails);
router.put('/change-password', auth,trackActivity, changePassword);

module.exports = router;
