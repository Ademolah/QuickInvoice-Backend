const User = require("../models/Users");
const Invoice = require("../models/Invoice");

const getReports = async (req, res) => {
  try {
    // Ensure you're getting the current user's ID from auth middleware
    const userId = req.userId;  

    const user = await User.findById(userId)

    // Only fetch invoices that belong to the current user
    const invoices = await Invoice.find({ 
      userId: userId, 
      businessId: user.activeBusinessId // 👈 THE FILTER
    });

    const invoiceCount = invoices.length;

    const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
    const pendingInvoices = invoices.filter(inv => inv.status === "sent").length;

    const totalRevenue = invoices
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    res.json({
      invoiceCount,
      paidInvoices,
      pendingInvoices,
      totalRevenue,
    });
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = getReports;
