// // routes/reportRoutes.js


const express = require('express')
const getReports  = require("../controllers/reportsController")
const auth = require("../middleware/authMiddleware")
const trackActivity = require('../middleware/trackActivity')
const Invoice = require("../models/Invoice")

const router = express.Router();



router.get('/', auth,trackActivity, getReports)

router.get("/statement", auth, async (req, res) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: "Month is required" });
    }
    const [year, m] = month.split("-");
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);
    const invoices = await Invoice.find({
      userId: req.userId,
      createdAt: { $gte: start, $lt: end },
    }).sort({ createdAt: 1 });
    res.json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (err) {
    console.error("Statement fetch error:", err);
    res.status(500).json({ message: "Failed to generate statement" });
  }
});





module.exports = router
