// routes/posRoutes.js
const router = require('express').Router();
const { syncPOSSales, } = require('../controllers/posController');
const auth = require('../middleware/authMiddleware');
const Sale = require('../models/Sale')

router.post('/process', auth, syncPOSSales);

// GET /api/pos/today

router.get('/today', auth, async (req, res) => {
  try {
    // 1. Capture businessId from the URL query (?businessId=...)
    const { businessId } = req.query;

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    // 2. Build a dynamic query
    let query = {
      createdAt: { 
        $gte: startOfToday, 
        $lte: endOfToday 
      }
    };

    // LOGIC: If a specific business is selected, filter by that ID.
    // If not, fallback to cashierId (this maintains backward compatibility).
    if (businessId && businessId !== 'null' && businessId !== 'undefined') {
      query.businessId = businessId;
    } else {
      query.cashierId = req.userId;
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 });

    // 3. Calculate total
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    console.log(`Branch: ${businessId || 'Main'} | Found ${sales.length} sales`);

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

router.get("/sales-summary", auth, async (req, res) => {
  try {
    const { range } = req.query; // 'weekly', 'monthly', 'yearly'
    let startDate = new Date();

    if (range === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else if (range === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else if (range === 'yearly') startDate.setFullYear(startDate.getFullYear() - 1);

    const sales = await Sale.find({
      cashierId: req.userId,
      createdAt: { $gte: startDate }
    });

    // 🚀 THE MAGIC: Aggregate items across all sales
    const reportData = {};
    let grandTotal = 0;

    sales.forEach(sale => {
      grandTotal += sale.totalAmount;
      sale.items.forEach(item => {
        if (!reportData[item.productId]) {
          reportData[item.productId] = { 
            name: item.name, 
            quantity: 0, 
            revenue: 0 
          };
        }
        reportData[item.productId].quantity += item.quantity;
        reportData[item.productId].revenue += (item.quantity * item.unitPrice);
      });
    });

    res.json({ 
      success: true, 
      summary: Object.values(reportData), 
      grandTotal,
      period: range 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;