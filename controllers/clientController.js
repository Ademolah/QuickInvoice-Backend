const Invoice = require("../models/Invoice");
const User = require("../models/Users")

const getClients = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Fetch ALL recent invoices for this specific active business
    // We sort by createdAt DESCENDING to get new clients first
    const invoices = await Invoice.find({ 
      userId: req.userId,
      businessId: user.activeBusinessId 
    })
    .sort({ createdAt: -1 }) 
    .select("clientName clientEmail clientPhone status createdAt");

    // 2. Deduplicate using a Map (better than Set for objects)
    const clientMap = new Map();
    
    for (let inv of invoices) {
      // Use email as the unique key
      if (!clientMap.has(inv.clientEmail)) {
        clientMap.set(inv.clientEmail, {
          name: inv.clientName,
          email: inv.clientEmail,
          phone: inv.clientPhone,
          paid_status: inv.status,
          date: inv.createdAt
        });
      }
    }

    // 3. Convert Map values to Array and limit to the top 20
    const clients = Array.from(clientMap.values()).slice(0, 20);

    res.json(clients);
  } catch (err) {
    console.error("Client Fetch Error:", err);
    res.status(500).json({ message: "Server error fetching clients" });
  }
};

module.exports = { getClients };
