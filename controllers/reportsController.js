const Invoice = require("../models/Invoice");

const getReports = async (req, res) => {
  try {
    const invoices = await Invoice.find();

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


module.exports = getReports

// const Invoice = require("../models/Invoice");

// const getReports = async (req, res) => {
//   try {
//     // Ensure you're getting the current user's ID from auth middleware
//     const userId = req.userId;  

//     // Only fetch invoices that belong to the current user
//     const invoices = await Invoice.find({ user: userId });

//     const invoiceCount = invoices.length;

//     const paidInvoices = invoices.filter(inv => inv.status === "paid").length;
//     const pendingInvoices = invoices.filter(inv => inv.status === "sent").length;

//     const totalRevenue = invoices
//       .filter(inv => inv.status === "paid")
//       .reduce((sum, inv) => sum + (inv.total || 0), 0);

//     res.json({
//       invoiceCount,
//       paidInvoices,
//       pendingInvoices,
//       totalRevenue,
//     });
//   } catch (error) {
//     console.error("Error fetching report:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// module.exports = getReports;
