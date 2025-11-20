const asyncHandler = require("express-async-handler");
const shipbubbleClient = require("../utils/shipbubble");
const User = require("../models/Users");
const Shipment = require("../models/Shipments"); // optional but recommended
const crypto = require("crypto");
/**
 * POST /api/logistics/validate-address
 * Body: { name, email, phone, address, latitude?, longitude?, role?: 'vendor'|'buyer', userId?: vendorIdIfSaving }
 * If role === 'vendor' and you provide userId (or use auth), the validated address_code will be saved to user.pickupAddress + user.pickupAddressCode
 */
exports.validateAddress = asyncHandler(async (req, res) => {
  const { name, email, phone, address, latitude, longitude, role } = req.body;
  if (!name || !email || !phone || !address) {
    return res.status(400).json({ message: "name, email, phone and address are required" });
  }
  try {
    const payload = { name, email, phone, address };
    if (latitude) payload.latitude = latitude;
    if (longitude) payload.longitude = longitude;
    const sbRes = await shipbubbleClient.post("/v1/shipping/address/validate", payload);
    if (!sbRes?.data) {
      return res.status(500).json({ message: "Empty response from Shipbubble" });
    }
    const data = sbRes.data.data;
    // Optionally save vendor pickup address to user if role === 'vendor' and req.userId exists
    // Support two methods: auth middleware sets req.userId OR client can send userId in body (less secure)
    if (role === "vendor") {
      const userId = req.userId || req.body.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          user.pickupAddress = {
            street: data.street || data.street || address,
            city: data.city || "",
            state: data.state || "",
            country: data.country || "Nigeria",
            postalCode: data.postal_code || "",
            latitude: data.latitude,
            longitude: data.longitude,
          };
          user.pickupAddressCode = data.address_code; // store address code for future fetch_rates
          await user.save();
        }
      }
    }
    return res.json({ status: "success", data });
  } catch (err) {
    console.error("Shipbubble validate-address error:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({ message: "Address validation failed", error: err.response?.data || err.message });
  }
});
/**
 * GET /api/logistics/categories
 * Returns label/package categories that will be used as category_id in fetch_rates
 */
exports.getCategories = asyncHandler(async (req, res) => {
  try {
    const sbRes = await shipbubbleClient.get("/v1/shipping/labels/categories");
    return res.json({ status: "success", data: sbRes.data.data || [] });
  } catch (err) {
    console.error("Shipbubble categories error:", err.response?.data || err.message);
    return res.status(500).json({ message: "Could not fetch categories", error: err.response?.data || err.message });
  }
});
/**
 * GET /api/logistics/couriers
 * List couriers available on Shipbubble
 */
exports.getCouriers = asyncHandler(async (req, res) => {
  try {
    const sbRes = await shipbubbleClient.get("/v1/shipping/couriers");
    return res.json({ status: "success", data: sbRes.data.data || [] });
  } catch (err) {
    console.error("Shipbubble couriers error:", err.response?.data || err.message);
    return res.status(500).json({ message: "Could not fetch couriers", error: err.response?.data || err.message });
  }
});
/**
 * POST /api/logistics/fetch-rates
 * Payload (frontend should send): {
 *   sender_address_code,
 *   reciever_address_code,
 *   pickup_date, // yyyy-mm-dd
 *   category_id,
 *   package_items: [ { name, description, unit_weight, unit_amount, quantity } ],
 *   service_type, // optional
 *   delivery_instructions, // optional
 *   package_dimension: { length, width, height }
 * }
 */
exports.fetchRates = asyncHandler(async (req, res) => {
  const {
    sender_address_code,
    reciever_address_code,
    pickup_date,
    category_id,
    package_items,
    service_type,
    delivery_instructions,
    package_dimension,
  } = req.body;
  if (!sender_address_code || !reciever_address_code || !pickup_date || !category_id || !Array.isArray(package_items) || package_items.length === 0) {
    return res.status(400).json({ message: "sender_address_code, reciever_address_code, pickup_date, category_id and package_items are required" });
  }
  try {
    const payload = {
      sender_address_code,
      reciever_address_code,
      pickup_date,
      category_id,
      package_items,
    };
    if (service_type) payload.service_type = service_type;
    if (delivery_instructions) payload.delivery_instructions = delivery_instructions;
    if (package_dimension) payload.package_dimension = package_dimension;
    const sbRes = await shipbubbleClient.post("/v1/shipping/fetch_rates", payload);
    // sbRes.data.data contains request_token and couriers array according to docs
    return res.json({ status: "success", data: sbRes.data.data || {} });
  } catch (err) {
    console.error("SHIPBUBBLE fetch_rates ERROR:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({ message: "Unable to fetch shipping rates", error: err.response?.data || err.message });
  }
});
/**
 * POST /api/logistics/create-shipment
 * Body: { request_token, service_code, courier_id, is_cod_label?, is_invoice_required?, items: [ {name, description, weight, amount, quantity} ] }
 */
exports.createShipment = asyncHandler(async (req, res) => {
  const { request_token, service_code, courier_id, is_cod_label = false, items = [], is_invoice_required = false } = req.body;
  if (!request_token || !service_code || !courier_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "request_token, service_code, courier_id and items are required" });
  }
  try {
    const payload = {
      request_token,
      service_code,
      courier_id,
      is_cod_label,
      is_invoice_required,
      items,
    };
    const sbRes = await shipbubbleClient.post("/v1/shipping/labels", payload);
    // Optionally persist shipment to DB
    const shipmentData = sbRes.data?.data || {};
    const shipment = await Shipment.create({
      request_token,
      courier_id,
      service_code,
      shipbubble_response: shipmentData,
      status: shipmentData.status || "pending",
      // save minimal summary fields
      order_id: shipmentData.order_id,
      tracking_url: shipmentData.tracking_url,
      payment: shipmentData.payment || {},
      ship_from: shipmentData.ship_from || {},
      ship_to: shipmentData.ship_to || {},
      items: shipmentData.items || [],
    });
    return res.json({ status: "success", data: shipmentData, local: shipment });
  } catch (err) {
    console.error("SHIPBUBBLE create label ERROR:", err.response?.data || err.message);
    const status = err.response?.status || 500;
    return res.status(status).json({ message: "Could not create shipment", error: err.response?.data || err.message });
  }
});
/**
 * POST /api/logistics/webhook
 * Shipbubble will post events here; verify signature header 'x-ship-signature'
 */
exports.shipbubbleWebhook = asyncHandler(async (req, res) => {
  // raw body required in route registration (express.raw({ type: 'application/json' }))
  const payload = req.body.toString ? req.body.toString() : JSON.stringify(req.body);
  const signature = req.headers["x-ship-signature"];
  const secret = process.env.SHIPBUBBLE_WEBHOOK_SECRET || "";
  if (!signature || !secret) {
    console.warn("Missing Shipbubble webhook signature or secret");
    return res.status(400).send("Missing signature or secret");
  }
  const expected = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  if (signature !== expected) {
    console.warn("Invalid Shipbubble webhook signature");
    return res.status(400).send("Invalid signature");
  }
  // parse event
  let event;
  try {
    event = JSON.parse(payload);
  } catch (e) {
    console.error("Invalid webhook JSON", e);
    return res.status(400).send("Invalid JSON");
  }
  // handle event types (sample)
  const eventType = event.event;
  console.log("Shipbubble webhook event:", eventType);
  try {
    if (eventType === "shipment.label.created" || eventType === "shipment.status.changed" || eventType === "shipment.cancelled" || eventType === "shipment.cod.remitted") {
      const orderId = event.order_id || event.data?.order_id;
      // optionally update local Shipment document using orderId
      if (orderId) {
        await Shipment.findOneAndUpdate({ order_id: orderId }, { shipbubble_response: event, status: event.status }, { new: true });
      }
      // Additional domain-specific handling here (notify vendor/customer)
    }
    // Always return 200 quickly
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err);
    return res.status(500).send("Server error");
  }
});