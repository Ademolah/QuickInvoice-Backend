const express = require("express");
const router = express.Router();
const { shipbubbleWebhook } = require("../controllers/shipbubbleWebhookControlller");


router.post("/webhook/shipbubble", express.json({ verify: rawBodySaver }), shipbubbleWebhook);

// Required to capture raw body for signature validation
function rawBodySaver(req, res, buf) {
  if (buf && buf.length) {
    req.rawBody = buf.toString();
  }
}

module.exports = router;