const express = require("express");
const router = express.Router();
const { handleShipbubbleWebhook } = require("../controllers/sandboxWebhookController");

router.post("/shipbubble/webhook", handleShipbubbleWebhook);

module.exports = router;
