const crypto = require("crypto");
const Order = require("../models/Order");  // adjust path as needed


exports.shipbubbleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-ship-signature"];
    const secret = process.env.SHIPBUBBLE_WEBHOOK_SECRET;
    if (!signature || !secret) {
      console.log("Missing Shipbubble signature or secret");
      return res.status(200).send("Missing signature");
    }
    // Convert raw request body to string for HMAC
    const rawBody = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");
    // Signature check
    if (computedSignature !== signature) {
      console.log("Invalid Shipbubble signature");
      return res.status(200).send("Invalid signature");
    }
    console.log("✅ Shipbubble Webhook Verified");
    const event = req.body.event;
    const payload = req.body;
    //  Extract critical fields
    const order_id = payload.order_id; // SB-BXXXXXXXXXXX
    const trackingUrl = payload.tracking_url;
    const shipmentStatus = payload.status;
    console.log("🚚 Shipbubble Event:", event);
    console.log("📌 Order:", order_id);
    console.log("🔗 Tracking URL:", trackingUrl);
    console.log("📦 Status:", shipmentStatus);
    // =============================
    //   shipment.label.created
    // =============================
    if (event === "shipment.label.created") {
      console.log("🏷️ Label created for:", order_id);
      // Find your internal order (market order)
      const order = await Order.findOne({ shipbubble_order_id: order_id });
      if (!order) {
        console.log(" Matching system order not found");
        return res.status(200).send("Order not found");
      }
      // Update tracking details
      order.tracking_url = trackingUrl;
      order.shippingStatus = shipmentStatus;
      await order.save();
      console.log("✅Tracking URL saved into Order:", trackingUrl);
      return res.status(200).send("Label event processed");
    }
    // =============================
    //   shipment.status.changed
    // =============================
    if (event === "shipment.status.changed") {
      console.log("🚦 Shipment status changed:", shipmentStatus);
      const order = await Order.findOne({ shipbubble_order_id: order_id });
      if (order) {
        order.shippingStatus = shipmentStatus;
        await order.save();
      }
      return res.status(200).send("Status updated");
    }
    // =============================
    //   shipment.cancelled
    // =============================
    if (event === "shipment.cancelled") {
      console.log(" Shipment cancelled for:", order_id);
      const order = await Order.findOne({ shipbubble_order_id: order_id });
      if (order) {
        order.shippingStatus = "cancelled";
        await order.save();
      }
      return res.status(200).send("Shipment cancelled processed");
    }
    // Fallback
    return res.status(200).send("Webhook received");
  } catch (error) {
    console.log(":x: Shipbubble Webhook Error:", error);
    return res.status(200).send("Error handled");
  }
};