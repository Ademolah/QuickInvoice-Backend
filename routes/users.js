const express = require('express');
const User = require('../models/Users'); // Assuming you have a User model
const auth = require('../middleware/authMiddleware');
const { updateAccountDetails, updatePickupAddress, getVendorSlug } = require('../controllers/usersController')
const { changePassword } = require('../controllers/usersController')
const axios = require('axios')
const asyncHandler = require('express-async-handler')
const upload = require('../middleware/upload')
const cloudinary = require('../utils/cloudinary')
const trackActivity = require('../middleware/trackActivity')
const Transactions = require('../models/Transaction')


const router = express.Router();

// Get current logged-in user info
// Get current logged-in user info
router.get('/me', auth, trackActivity, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Convert to object so we can add virtual/computed fields
    const userObj = user.toObject();

    // 1. Determine the "Active Context"
    // This tells the Frontend: "This is the business name/logo you should show right now"
    let activeContext = {
      id: null, // null means Main Account
      businessName: user.businessName,
      logo: user.avatar, 
      address: user.pickupAddress,
      isEnterpriseEntity: false
    };

    if (user.activeBusinessId) {
      // Find the specific sub-business in the array
      const subBiz = user.enterpriseBusinesses.find(
        (b) => b._id.toString() === user.activeBusinessId.toString()
      );

      if (subBiz) {
        activeContext = {
          id: subBiz._id,
          businessName: subBiz.businessName,
          logo: subBiz.logo?.url,
          address: subBiz.address,
          isEnterpriseEntity: true
        };
      }
    }

    // 2. Attach the context to the response
    res.json({
      ...userObj,
      activeContext // The Frontend will now use user.activeContext.businessName
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// In your userRoutes.js or wherever your routes are defined
router.get("/account-details", auth, trackActivity, async (req, res) => {
  try {
    const userId = req.userId;

    // 1. Fetch user with both global details AND enterprise businesses
    const user = await User.findById(userId).select("accountDetails enterpriseBusinesses activeBusinessId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Default to the main accountDetails (The "Global Parent")
    let activeDetails = user.accountDetails;

    // 3. Context Check: Are we in a sub-business?
    if (user.activeBusinessId) {
      const activeBusiness = user.enterpriseBusinesses.id(user.activeBusinessId);
      
      // Check if this specific business has its own account number set
      // We check for a specific field like 'accountNumber' to ensure it's not just an empty object {}
      if (activeBusiness && activeBusiness.accountDetails && activeBusiness.accountDetails.accountNumber) {
        activeDetails = activeBusiness.accountDetails;
        console.log(`Using Business-Specific Bank Details for: ${activeBusiness.businessName}`);
      } else {
        console.log(`Business specific details not found. Falling back to Main Account details.`);
      }
    }

    res.json({ 
      success: true,
      accountDetails: activeDetails 
    });
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

router.post('/avatar', auth, trackActivity, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // 1. Identify the Context (Is this for the Main account or a Sub-Business?)
  const activeBusiness = user.activeBusinessId 
    ? user.enterpriseBusinesses.id(user.activeBusinessId) 
    : null;

  // 2. Cloudinary Upload Helper (remains efficient)
  const bufferStreamUpload = (buffer) =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `quickinvoice_ng/${activeBusiness ? 'business_logos' : 'avatars'}`,
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" }
          ],
          format: 'png',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

  // 3. Clean up OLD image (Context-Aware)
  const existingPublicId = activeBusiness ? activeBusiness.avatarPublicId : user.avatarPublicId;
  
  if (existingPublicId) {
    try {
      await cloudinary.uploader.destroy(existingPublicId);
    } catch (err) {
      console.warn('Cleanup failed', err.message);
    }
  }

  // 4. Upload & Save
  const result = await bufferStreamUpload(req.file.buffer);

  if (activeBusiness) {
  // Use your schema's specific 'logo' object structure
  activeBusiness.logo = {
    url: result.secure_url,
    publicId: result.public_id
  };
  } else {
    // Main account still uses 'avatar'
    user.avatar = result.secure_url;
    user.avatarPublicId = result.public_id;
  }

  await user.save();

  console.log(`Logo/Avatar updated for context: ${activeBusiness ? activeBusiness.businessName : 'Main Account'}`);

  res.json({
    message: 'Logo updated successfully',
    avatar: result.secure_url,
    avatarPublicId: result.public_id,
  });
}));



router.put("/complete-profile", auth, trackActivity, async (req, res) => {
  try {
    // const userId = req.params.id;
    const userId = req.userId
    const { nationality, date_of_birth, residential_address, occupation } = req.body;
    // Validate input (optional strict validation)
    if (!nationality || !date_of_birth || !residential_address || !occupation) {
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


router.post("/verify-nin", auth, trackActivity, async (req, res) => {
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



router.put('/account-details', auth, trackActivity, updateAccountDetails);
router.put('/change-password', auth, trackActivity, changePassword);
router.put('/pickup-address', auth, trackActivity, updatePickupAddress)
router.get("/vendor/:id", getVendorSlug);

module.exports = router;
