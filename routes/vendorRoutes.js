const express = require("express");
const router = express.Router();
const { getVendorStats } = require("../controllers/vendorController");
const auth = require("../middleware/authMiddleware");


router.get("/stats", auth, getVendorStats);


module.exports = router;