const Invoice = require("../models/Invoice");

const getClients = async (req, res) => {
  try {
    // Fetch invoices for logged-in user
    const invoices = await Invoice.find({ userId: req.userId })
      .select("clientName clientEmail clientPhone status")
      .limit(50); // just in case before deduplication

    // Deduplicate by email
    const seen = new Set();
    const clients = [];
    for (let inv of invoices) {
      if (!seen.has(inv.clientEmail)) {
        seen.add(inv.clientEmail);
        clients.push({
          name: inv.clientName,
          email: inv.clientEmail,
          phone: inv.clientPhone,
          paid_status: inv.status,
        });
      }
    }

    // Limit final result to 10
    res.json(clients.slice(0, 10));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching clients" });
  }
};

module.exports = { getClients };
