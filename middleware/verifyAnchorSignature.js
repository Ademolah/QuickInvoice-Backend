const crypto = require("crypto");



function verifyAnchorSignature(req, res, next) {
  try {
    const signature = req.headers["x-anchor-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing Anchor signature" });
    }
    // stringify request body as Anchor sends raw JSON
    const rawBody = JSON.stringify(req.body);
    // calculate expected hash
    const expectedHash = Buffer.from(
      crypto
        .createHmac("sha1", process.env.ANCHOR_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex")
    ).toString("base64");
    if (signature !== expectedHash) {
      return res.status(401).json({ error: "Invalid Anchor signature" });
    }
    next();
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
module.exports = verifyAnchorSignature;