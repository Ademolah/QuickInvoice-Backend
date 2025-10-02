
// routes/anchorRoutes.js
const express = require("express");
const router = express.Router();
const Transaction = require("../../models/Transactions");
const User = require("../../models/Users");
const verifyAnchorSignature = require('../../middleware/verifyAnchorSignature')
const sendCreditAlert = require('../../utils/sendCreditAlert')




router.post("/transaction-webhook", verifyAnchorSignature, async (req, res) => {
  try {
    console.log("Incoming Webhook:", JSON.stringify(req.body, null, 2));

    const eventType = req.body?.data?.type;
    if (eventType !== "nip.inbound.settled") {
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
      // transactionReference: reference || null,
      transactionReference: reference || `${Date.now()}-${Math.floor(Math.random()) }`,
      transactionStatus:
        status === "COMPLETED" ? "COMPLETED" : "PENDING",
      accountBalance: availableBalance,
    });
    res.status(200).json({ received: true });
    try {
      sendCreditAlert(amount, sourceBank?.name, user.email, sourceAccountName, user.name, sourceAccountNumber, new Date().toLocaleString(), reference, description)
    } catch (error) {
      console.error("❌ Failed to send credit alert email:", error.message);
    }
  } catch (error) {
    console.error("Webhook handling error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});





module.exports = router;



