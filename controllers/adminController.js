const User = require("../models/Users");
const Invoice = require("../models/Invoice");
const InvoiceLog = require("../models/InvoiceLog");
const Activity = require("../models/Activity");

exports.getGlobalStats = async (req, res) => {
    try {
        // Execute all analytical queries in parallel
        const [
            totalEntities,
            revenueData,
            invoiceCount,
            receiptCount
        ] = await Promise.all([
            // 1. Total Entities (Total Users with role 'user')
            User.countDocuments({
                $or: [
                    { role: "user" },
                    { role: { $exists: false } }
                ]
            }),

            // 2. Total Volume (Sum of 'subtotal' field in all Invoices)
            Invoice.aggregate([
                { $group: { _id: null, totalVolume: { $sum: "$subtotal" } } }
            ]),

            // 3. Total Invoices (Count 'type': 'invoice' in InvoiceLog)
            InvoiceLog.countDocuments({ type: "invoice" }),

            // 4. Total Receipts (Count 'type': 'receipt' in InvoiceLog)
            InvoiceLog.countDocuments({ type: "receipt" })
        ]);

        // Format the revenue (Handle case where there are no invoices yet)
        const totalVolume = revenueData.length > 0 ? revenueData[0].totalVolume : 0;

        console.log(`Admin ${req.userId} fetched platform stats`);

        res.status(200).json({
            success: true,
            stats: {
                totalEntities,        // "Total Entities"
                totalVolume,          // "Total Volume" (Sum of subtotals)
                totalInvoices: invoiceCount,
                totalReceipts: receiptCount,
                platformHealth: "Optimal",
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch platform metrics" });
    }
};

exports.getPlatformFeed = async (req, res) => {
  try {
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(); // Faster performance for read-only

    res.status(200).json({
      success: true,
      feed: activities // Consistently named for the dashboard
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activity feed" });
  }
};