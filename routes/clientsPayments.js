// const express = require("express");
// const router = express.Router();
// const auth = require("../middleware/authMiddleware");
// const Transaction = require("../models/Transaction");
// const crypto = require("crypto");
// const provider = require("../services/paymentProvider"); // adapter

// // POST /api/payments/initiate
// router.post("/initiate", auth, async (req, res) => {
//   try {
//     const { amount, method, note } = req.body;
//     if (!amount || amount <= 0) return res.status(400).json({ message: "Invalid amount." });
//     if (!["NFC", "QR", "LINK"].includes(method)) return res.status(400).json({ message: "Invalid method." });

//     const reference = `QNG_${Date.now()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
//     const tx = await Transaction.create({
//       userId: req.userId,
//       amount,
//       method,
//       status: "pending",
//       reference,
//       note,
//     });

//     res.json({ reference: tx.reference, amount: tx.amount, status: tx.status });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: "Server error initiating payment" });
//   }
// });

// // POST /api/payments/confirm
// router.post("/confirm", auth, async (req, res) => {
//   try {
//     const { reference, cardToken } = req.body;
//     const tx = await Transaction.findOne({ reference, userId: req.userId });
//     if (!tx) return res.status(404).json({ message: "Transaction not found" });
//     if (tx.status !== "pending") return res.status(400).json({ message: "Transaction already processed" });

//     // Charge with provider (mock now; real later)
//     const chargeResult = await provider.chargeCardPresent({
//       amount: tx.amount,
//       reference: tx.reference,
//       userId: req.userId,
//       cardToken, // from NFC read / provider SDK
//     });

//     tx.status = chargeResult.success ? "success" : "failed";
//     tx.settledTo = chargeResult.settledTo || null;
//     await tx.save();

//     res.json({ reference: tx.reference, amount: tx.amount, status: tx.status });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ message: "Server error confirming payment" });
//   }
// });

// // (Optional) Webhook endpoint for provider to confirm async events
// router.post("/webhook", express.json({ type: "*/*" }), async (req, res) => {
//   try {
//     // verify signature if provider supports
//     const evt = req.body;
//     // match by reference, update tx.status accordingly
//     // await Transaction.findOneAndUpdate({ reference: evt.reference }, { status: evt.status });
//     res.sendStatus(200);
//   } catch (e) {
//     console.error(e);
//     res.sendStatus(500);
//   }
// });

// module.exports = router;


// routes/paymentRoutes.js

const express = require('express')
const axios = require('axios')
const Payment = require("../models/Payments.js");
const ActivityLog = require("../models/Activity.js");

const router = express.Router();

// Initialize Payment
router.post("/initiate", async (req, res) => {
  try {
    const { amount, email, userId } = req.body;

    // Initialize transaction with Paystack
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100, // Paystack works in kobo
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const { reference, authorization_url } = response.data.data;

    // Save Payment in DB
    const payment = await Payment.create({
      user: userId,
      amount,
      reference,
      status: "pending",
    });

    // Log Activity
    await ActivityLog.create({
      user: userId,
      action: `Payment of ₦${amount} initialized`,
      type: "payment",
    });

    await payment.save()

    res.json({ authorization_url, reference });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

// Webhook (Paystack → our server)
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const { reference, amount, customer } = event.data;

      const payment = await Payment.findOneAndUpdate(
        { reference },
        { status: "success" },
        { new: true }
      );

      if (payment) {
        await ActivityLog.create({
          user: payment.user,
          action: `Received ₦${amount / 100} from ${customer.email}`,
          type: "payment",
        });
      }
    }

    res.sendStatus(200); // Acknowledge webhook
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

// Fetch Payment History
router.get("/history/:userId", async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router

