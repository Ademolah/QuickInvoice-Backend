const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Invoice = require("../models/Invoice");

router.post("/paystack-webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    // Verify signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(req.body)
      .digest("hex");
    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(401).send("Invalid signature");
    }
    const event = JSON.parse(req.body.toString());
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      // Find invoice by reference (you must store reference in DB at initiate)
      const invoice = await Invoice.findOne({ paystackReference: reference });
      if (invoice) {
        invoice.status = "paid";
        await invoice.save();
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
});


module.exports = router;