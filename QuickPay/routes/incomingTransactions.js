
// routes/anchorRoutes.js
const express = require("express");
const router = express.Router();
const Transaction = require("../../models/Transactions");
const User = require("../../models/Users");
const verifyAnchorSignature = require('../../middleware/verifyAnchorSignature')






// router.post("/transaction-webhook", async (req, res) => {
//   try {
//     console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));
//     const eventType = req.body?.data?.type;
//     // ✅ Only process completed inbound transfers
    
//     if (eventType === "nip.inbound.completed") {
//       const payload = req.body?.data?.attributes;
//       const {
//         sessionId,
//         transactionReference,
//         accountId,
//         amount,
//         currency,
//         description,
//         senderName,
//         senderBank,
//         senderAccountNumber,
//         balanceAfter, // If supplied by Anchor
//         customerId, // Anchor's customer ID
//       } = payload;

//       // ✅  Find user by anchor customer ID
//       const user = await User.findOne({
//         "anchor.customerId": customerId,
//       });
//       if (!user) {
//         console.error(
//           "User not found for customerId:",
//           customerId
//         );
//         return res.status(404).json({ message: "User not found" });
//       }
//       // ✅  Create transaction document

//       await Transaction.create({
//         user: user._id,
//         transactionType: "INBOUND_TRANSFER",
//         transactionDetail: {
//           name: senderName || null,
//           bank: senderBank || null,
//           accountNumber: senderAccountNumber || null,
//         },
//         transactionAmount: amount || 0,
//         transactionDescription: description || null,
//         sessionId: sessionId || null,
//         accountId: accountId || null,
//         currency: currency || "NGN",
//         transactionReference: transactionReference || null,
//         transactionStatus: "COMPLETED",
//         accountBalance: balanceAfter || user.anchor?.balance || 0,
//       });
//     }


//     return res.status(200).json({ received: true });
//   } catch (error) {
//     console.error("Error handling webhook:", error.message);
//     return res.status(500).json({ message: "Webhook error" });
//   }
// });


router.post("/transaction-webhook", verifyAnchorSignature, async (req, res) => {
  try {
    console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));

    const eventType = req.body?.data?.type;
    if (eventType !== "nip.inbound.completed") {
      return res.status(200).json({ message: "Event ignored" });
    }

    const included = req.body?.included || [];
    const inboundTransfer = included.find(
      (item) => item.type === "InboundNIPTransfer"
    );

    const accountInfo = included.find(
      (item) => item.type === "DepositAccount"
    );

    if (!inboundTransfer || !accountInfo) {
      console.error("Missing required included data");
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    const attributes = inboundTransfer.attributes || {};
    const relData = inboundTransfer.relationships?.account?.data;
    const {
      reference,
      amount,
      description,
      currency,
      sessionId,
      sourceAccountNumber,
      sourceAccountName,
      sourceBank,
      status,
    } = attributes;

    const accountId = relData?.id || null;
    const availableBalance =
      accountInfo?.attributes?.availableBalance || 0;

    // ✅  Find user by anchor customer ID Find user by Anchor accountId
    const user = await User.findOne({
        "anchor.account.id": accountId,
      });

    if (!user) {
      console.error("User not found for accountId:", accountId);
      return res.status(404).json({ message: "User not found" });
    }


    // ✅  Create Transaction Document
    await Transaction.create({
      user: user._id,
      transactionType: "INBOUND_TRANSFER",
      transactionDetail: {
        name: sourceAccountName || null,
        bank: sourceBank?.name || null,
        accountNumber: sourceAccountNumber || null,
      },
      transactionAmount: amount || 0,
      transactionDescription: description || null,
      sessionId: sessionId || null,
      accountId: accountId,
      currency: currency || "NGN",
      transactionReference: reference || null,
      transactionStatus:
        status === "COMPLETED" ? "COMPLETED" : "PENDING",
      accountBalance: availableBalance,
    });
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook handling error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});





module.exports = router;



