// // routes/reportRoutes.js
// const express = require('express')
// const Invoice = require('../models/Invoice')

// const router = express.Router();

// // GET /api/reports/:userId?period=monthly
// router.get("/:userId", async (req, res) => {
//   const { userId } = req.params;
//   const { period = "monthly" } = req.query;

//   try {
//     let startDate, endDate = new Date();

//     if (period === "daily") {
//       startDate = new Date();
//       startDate.setHours(0, 0, 0, 0);
//     } else if (period === "weekly") {
//       startDate = new Date();
//       startDate.setDate(startDate.getDate() - 7);
//     } else if (period === "monthly") {
//       startDate = new Date();
//       startDate.setMonth(startDate.getMonth() - 1);
//     } else if (period === "yearly") {
//       startDate = new Date();
//       startDate.setFullYear(startDate.getFullYear() - 1);
//     }

//     // Aggregate from Invoices
//     const invoices = await Invoice.aggregate([
//       {
//         $match: {
//           userId: userId,
//           createdAt: { $gte: startDate, $lte: endDate },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           invoicesCount: { $sum: 1 },
//           totalRevenue: {
//             $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$amount", 0] },
//           },
//           paidInvoices: {
//             $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
//           },
//           pendingInvoices: {
//             $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
//           },
//         },
//       },
//     ]);

//     res.json({
//       userId,
//       period,
//       startDate,
//       endDate,
//       stats: invoices[0] || {
//         invoicesCount: 0,
//         totalRevenue: 0,
//         paidInvoices: 0,
//         pendingInvoices: 0,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Error generating report" });
//   }
// });

// module.exports = router

const express = require('express')
const getReports  = require("../controllers/reportsController")
const auth = require("../middleware/authMiddleware")
const trackActivity = require('../middleware/trackActivity')

const router = express.Router();



router.get('/', auth,trackActivity, getReports)





module.exports = router
