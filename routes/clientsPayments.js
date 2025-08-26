// routes/paymentRoutes.js
const router = require("express").Router();
const axios = require("axios");
const auth = require("../middleware/authMiddleware");
const Payment = require("../models/Payments");
const User = require("../models/Users");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// 📌 Get list of banks
router.get("/banks", auth, async (req, res) => {
  try {
    const resp = await axios.get("https://api.paystack.co/bank", {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    res.json(resp.data.data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch banks" });
  }
});

// 📌 Create Payment Link
// router.post("/create-link", auth, async (req, res) => {
//   try {
//     const { amount, description } = req.body;
//     const user = await User.findById(req.userId);
//     if (!user?.paystack?.subaccountCode) {
//       return res.status(400).json({ message: "No subaccount linked" });
//     }

//     const reference = `QINV-${Date.now()}-${Math.floor(Math.random()*1000)}`;

//     const resp = await axios.post("https://api.paystack.co/transaction/initialize", {
//       email: user.email,
//       amount: amount * 100, // in kobo
//       reference,
//       subaccount: user.paystack.subaccountCode,
//       split: {
//         type: "percentage",
//         bearer_type: "subaccount",
//         subaccounts: [
//           { subaccount: user.paystack.subaccountCode, share: user.paystack.splitPercentage },
//         ],
//       },
//       metadata: { description, userId: user._id },
//     }, {
//       headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
//     });

//     const payment = new Payment({
//       user: user._id,
//       reference,
//       amount,
//       description,
//       status: "pending",
//     });
//     await payment.save();

//     res.json({
//       authorization_url: resp.data.data.authorization_url,
//       reference,
//     });
//   } catch (err) {
//     console.error("create-link failed", err.response?.data || err.message);
//     res.status(500).json({ message: "Failed to create payment link" });
//   }
// });

// // 📌 Create Payment Link
// router.post("/create-link", auth, async (req, res) => {
//   try {
//     const { amount, description } = req.body;
//     const user = await User.findById(req.userId);
//     if (!user?.paystack?.subaccountCode) {
//       return res.status(400).json({ message: "No subaccount linked" });
//     }

//     const reference = `QINV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

//     // ✅ Correct structure for Paystack initialize
//     const resp = await axios.post(
//       "https://api.paystack.co/transaction/initialize",
//       {
//         email: user.email,
//         amount: amount * 100, // Paystack expects kobo
//         reference,
//         subaccount: user.paystack.subaccountCode, // ✅ attach subaccount
//         bearer: "subaccount", // ✅ charges go to subaccount
//         metadata: {
//           description,
//           userId: user._id,
//         },
//       },
//       {
//         headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
//       }
//     );

//     // Save payment in DB
//     const payment = new Payment({
//       user: user._id,
//       reference,
//       amount,
//       description,
//       status: "pending",
//     });
//     await payment.save();

//     res.json({
//       authorization_url: resp.data.data.authorization_url,
//       reference,
//     });
//   } catch (err) {
//     console.error("create-link failed", err.response?.data || err.message);
//     res.status(500).json({ message: "Failed to create payment link" });
//   }
// });

// 📌 Create Payment Link
router.post("/create-link", auth, async (req, res) => {
  try {
    const { amount, description, invoiceId } = req.body; // ✅ now accept invoiceId
    const user = await User.findById(req.userId);

    if (!user?.paystack?.subaccountCode) {
      return res.status(400).json({ message: "No subaccount linked" });
    }

    const reference = `QINV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // ✅ Initialize Paystack transaction
    const resp = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: user.email,
        amount: amount * 100, // Paystack expects kobo
        reference,
        subaccount: user.paystack.subaccountCode,
        bearer: "subaccount",
        metadata: {
          description,
          userId: user._id,
          invoiceId, // ✅ store invoiceId in Paystack metadata too
        },
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    // ✅ Save payment in DB
    const payment = new Payment({
      user: user._id,
      reference,
      amount,
      description,
      invoiceId,  // ✅ store invoiceId
      status: "pending",
    });
    await payment.save();

    res.json({
      authorization_url: resp.data.data.authorization_url,
      reference,
      invoiceId, // ✅ send back invoiceId for frontend tracking
    });
  } catch (err) {
    console.error("create-link failed", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to create payment link" });
  }
});

// 📌 Verify Payment
router.get("/verify/:reference", auth, async (req, res) => {
  try {
    const { reference } = req.params;

    // ✅ Call Paystack verify API
    const resp = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const data = resp.data.data;
    if (!data) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // ✅ Extract status & useful details
    const status = data.status; // success, failed, or abandoned
    const paidAmount = data.amount / 100; // convert kobo to naira
    const paidAt = data.paid_at;

    // ✅ Update payment in DB
    const payment = await Payment.findOneAndUpdate(
      { reference },
      {
        status,
        amount: paidAmount,
        paidAt,
        gateway_response: data.gateway_response,
        channel: data.channel,
        currency: data.currency,
      },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found" });
    }

    res.json({
      message: "Payment verification successful",
      status,
      payment,
      paystack: data,
    });
  } catch (err) {
    console.error("verify error:", err.response?.data || err.message);
    res.status(500).json({ message: "Verification failed" });
  }
});




// // 📌 Verify Payment
// router.get("/verify/:reference", auth, async (req, res) => {
//   try {
//     const { reference } = req.params;
//     const resp = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
//       headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
//     });

//     const status = resp.data.data.status;
//     await Payment.findOneAndUpdate({ reference }, { status });

//     res.json({ status, data: resp.data.data });
//   } catch (err) {
//     res.status(500).json({ message: "Verification failed" });
//   }
// });

// ✅ Verify payment by invoiceId (QINV-...)
router.get("/verify/:invoiceId", async (req, res) => {
  const { invoiceId } = req.params;

  try {
    // 1. Look up invoice in DB
    const invoice = await Invoice.findOne({ invoiceId });
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // 2. Ensure we saved Paystack reference when creating invoice/payment
    if (!invoice.paystackReference) {
      return res.status(400).json({ error: "No Paystack reference for this invoice" });
    }

    // 3. Call Paystack verify endpoint with stored reference
    const verifyRes = await axios.get(
      `https://api.paystack.co/transaction/verify/${invoice.paystackReference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = verifyRes.data;

    // 4. If successful, update invoice status
    if (data.data.status === "success") {
      invoice.status = "paid";
      await invoice.save();
    }

    res.json({
      status: invoice.status,
      paystack: data.data,
    });
  } catch (err) {
    console.error("Verify error:", err.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
});



// // POST /api/payments/onboard-bank
// router.post("/onboard-bank", auth, async (req, res) => {
//   try {
//     const { businessName, bankCode, accountNumber } = req.body;

//     if (!businessName || !bankCode || !accountNumber) {
//       return res.status(400).json({
//         status: false,
//         message: "Missing required fields",
//       });
//     }

//     // Create a subaccount on Paystack
//     const response = await axios.post(
//       "https://api.paystack.co/subaccount",
//       {
//         business_name: businessName,
//         settlement_bank: bankCode,
//         account_number: accountNumber,
//         percentage_charge: 0, // for now no split fee
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     return res.json({
//       status: true,
//       message: "Subaccount created",
//       data: response.data.data,
//     });
//   } catch (error) {
//     console.error("onboard-bank failed", error.response?.data || error.message);
//     return res.status(500).json({
//       status: false,
//       message: "Failed to onboard bank",
//       error: error.response?.data || error.message,
//     });
//   }
// });

// GET /api/payments/banks

// POST /api/payments/onboard-bank
router.post("/onboard-bank", auth, async (req, res) => {
  try {
    const { businessName, bankCode, accountNumber } = req.body;

    // Validate input
    if (!businessName || !bankCode || !accountNumber) {
      return res.status(400).json({
        status: false,
        message: "businessName, bankCode, and accountNumber are required",
      });
    }

    // Call Paystack API to create a subaccount
    const response = await axios.post(
      "https://api.paystack.co/subaccount",
      {
        business_name: businessName,
        settlement_bank: bankCode,
        account_number: accountNumber,
        percentage_charge: 0, // adjust if you want platform fees later
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Success response
    return res.status(201).json({
      status: true,
      message: "Subaccount created successfully",
      data: response.data.data,
    });

  } catch (error) {
    console.error("❌ Onboard-bank error:", error.response?.data || error.message);

    return res.status(error.response?.status || 500).json({
      status: false,
      message: "Failed to onboard bank",
      error: error.response?.data?.message || error.message,
    });
  }
});


router.get("/banks", auth, async (req, res) => {
  try {
    const response = await axios.get("https://api.paystack.co/bank", {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    return res.json({
      status: true,
      data: response.data.data, // list of banks
    });
  } catch (error) {
    console.error("banks fetch failed", error.response?.data || error.message);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch banks",
      error: error.response?.data || error.message,
    });
  }
});



// 📌 Recent Payments
router.get("/my", auth, async (req, res) => {
  const payments = await Payment.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(payments);
});

module.exports = router;














