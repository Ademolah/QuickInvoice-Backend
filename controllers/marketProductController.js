const asyncHandler = require("express-async-handler");
const MarketProduct = require("../models/MarketProduct");
// @desc    Get all products randomly for MarketZone
// @route   GET /api/marketzone
// @access  Public



exports.getAllMarketProducts = asyncHandler(async (req, res) => {
  try {
    const products = await MarketProduct.aggregate([{ $sample: { size: 250 } }]); // randomly fetch up to 50
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});