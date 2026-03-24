// routes/posRoutes.js
const router = require('express').Router();
const { processPOSSale, } = require('../controllers/posController');
const auth = require('../middleware/authMiddleware');
const Sale = require('../models/Sale')

router.post('/process', auth, processPOSSale);

// GET /api/pos/today
router.get('/today', async (req, res) => {
  try {
    // 1. Get the current date and force it to the very start of the day in UTC
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // 2. Query with the explicit range
    const sales = await Sale.find({
      cashierId: req.userId, // 👈 Make sure this matches your data (your log shows cashierId)
      createdAt: { 
        $gte: startOfToday, 
        $lte: endOfToday 
      }
    }).sort({ createdAt: -1 });

    // 3. Calculate total
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    console.log(`Found ${sales.length} sales for UTC Date: ${startOfToday.toISOString()}`);

    res.json({
      success: true,
      sales,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: "Sync error", error: error.message });
  }
});


// Route: /api/pos/receipt/:id
router.get("/receipt/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Create a dynamic query object
    let query = {};

    // 2. Logic: If it starts with 'QN-', it's definitely a receipt number
    if (id.startsWith("QN-")) {
      query = { receiptNumber: id };
    } 
    // Otherwise, check if it's a valid 24-character MongoDB ObjectId
    else if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { _id: id };
    } 
    // If it's neither, it's a bad request
    else {
      return res.status(400).json({ success: false, message: "Invalid Receipt ID format" });
    }

    // 3. Execute the search
    const sale = await Sale.findOne(query);

    if (!sale) {
      return res.status(404).json({ success: false, message: "Receipt not found in database" });
    }

    res.json({ success: true, sale });
  } catch (error) {
    console.error("Backend Receipt Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;