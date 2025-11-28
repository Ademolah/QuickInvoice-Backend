
const asyncHandler = require("express-async-handler");



exports.handleShipbubbleWebhook = asyncHandler(async (req, res) => {
  try {
    console.log("📦 Shipbubble Webhook Received:", req.body);
    // Always respond within 15s
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(200).send("OK");  // Must still return 200
  }
});