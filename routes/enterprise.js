// routes/enterprise.js
const express = require('express');
const router = express.Router();
const User = require('../models/Users');
const auth = require("../middleware/authMiddleware")

// @desc    Add a new sub-business (Enterprise Only)
// @route   POST /api/enterprise/add-business
router.post('/add-business', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    // 1. Authorization Check
    if (user.plan !== 'enterprise') {
      return res.status(403).json({ message: "Enterprise plan required for multiple businesses." });
    }

    // 2. Limit Check (Main + 4 extras = 5 total)
    if (user.enterpriseBusinesses.length >= 4) {
      return res.status(400).json({ message: "Maximum limit of 5 businesses reached." });
    }

    const { businessName, address, logoUrl } = req.body;

    // 3. Create a unique slug for this business
    const slug = businessName.toLowerCase().split(' ').join('-') + '-' + Math.floor(1000 + Math.random() * 9000);

    const newBusiness = {
      businessName,
      slug,
      logo: { url: logoUrl },
      address
    };

    user.enterpriseBusinesses.push(newBusiness);
    await user.save();

    res.status(201).json({ 
      success: true, 
      message: "New business entity added successfully",
      businesses: user.enterpriseBusinesses 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc    Switch the active business context
// @route   POST /api/enterprise/switch-context
router.post('/switch-context', auth, async (req, res) => {
  try {
    const { businessId } = req.body; // Pass null to switch to "Main" account
    
    const user = await User.findById(req.userId);
    
    // Safety check: ensure the businessId belongs to this user
    if (businessId) {
       const exists = user.enterpriseBusinesses.id(businessId);
       if (!exists) return res.status(404).json({ message: "Business not found" });
    }

    user.activeBusinessId = businessId;
    await user.save();

    res.json({ success: true, activeBusinessId: user.activeBusinessId });
  } catch (err) {
    res.status(500).json({ message: "Context switch failed" });
  }
});

module.exports = router;