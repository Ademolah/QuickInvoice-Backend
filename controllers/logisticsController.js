
const shipbubbleClient = require("../utils/shipbubble");
const User = require("../models/Users");
const Shipment = require("../models/Shipments"); 
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const axios = require('axios')
const Order = require('../models/Order')





// get user state

exports.getUserAddress = asyncHandler(async (req, res) => {
  try {
    const { vendorId } = req.body;
    if(!vendorId){
      return res.status(400).json({status: "failed", message: "vendorId is required"})
    }

    const vendor = await User.findById(vendorId)

    return res.json({status: "success", data: vendor.pickupAddress || null})
    
  } catch (error) {
    console.log("Get user state error:", error);
    return res.status(500).json({ status: "failed", message: "Could not fetch user state", error: error.message });
  }
})
/**
 * POST /api/logistics/validate-address
 * Body: { name, email, phone, address, latitude?, longitude?, role?: 'vendor'|'buyer', userId?: vendorIdIfSaving }
 * If role === 'vendor' and you provide userId (or use auth), the validated address_code will be saved to user.pickupAddress + user.pickupAddressCode
 */
exports.validateVendorAddress = async (req, res) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) {
      return res.status(400).json({ status: "failed", message: "vendorId is required" });
    }
    const vendor = await User.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ status: "failed", message: "Vendor not found" });
    }
    if (!vendor.pickupAddress) {
      return res.status(400).json({ status: "failed", message: "Vendor has no pickup address" });
    }
    const { street, city, state, country} = vendor.pickupAddress;
    const fullAddress = `${street}, ${city}, ${state}, ${country}`.trim();
    console.log("Validating vendor address:", fullAddress);
    const payload = {
      name: vendor.businessName || vendor.name,
      email: vendor.email,
      phone: vendor.phone || "08000000000",
      address: fullAddress
    };
    const response = await axios.post(
      "https://api.shipbubble.com/v1/shipping/address/validate",
      payload,
      { headers: { Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}` } }
    );
    console.log("✅Address validated: ", fullAddress);
    return res.json({
      status: "success",
      senderAddressCode: response.data.data.address_code
    });
    
  } catch (err) {
    console.log("Vendor validation error:", err.response?.data || err);
    return res.status(500).json({ status: "failed", message: "Vendor address validation failed" });
  }
};


exports.validateCustomerAddress = async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!address || !name || !email || !phone) {
      return res.status(400).json({
        status: "failed",
        message: "Address, name, email and phone are required"
      });
    }
    const payload = { address, name, email, phone };
    const response = await axios.post(
      "https://api.shipbubble.com/v1/shipping/address/validate",
      payload,
      { headers: { Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}` } }
    );
    console.log("✅Customer Address validated");
    return res.json({
      status: "success",
      receiverAddressCode: response.data.data.address_code
    });
  } catch (err) {
    console.log("Customer validation error:", err.response?.data || err);
    return res.status(500).json({ status: "failed", message: "Customer address validation failed" });
  }
};
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
    return res.json({ status: "success", data: sbRes.data || [] });
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
exports.fetchGeneralRates = async (req, res) => {
  try {
    const {
      sender_address_code,
      reciever_address_code,
      pickup_date,
      category_id,
      package_items,
      package_dimension,
      service_type,
      delivery_instructions
    } = req.body;
    // Validate all required fields
    const errors = [];
    if (!sender_address_code) errors.push("Sender address code is required");
    if (!reciever_address_code) errors.push("Receipient address code is required");
    if (!pickup_date) errors.push("Pickup date is required");
    if (!category_id) errors.push("Please select a package category");
    if (!package_items || package_items.length === 0) errors.push("Package items are required");
    if (!package_dimension) errors.push("Package dimension is required");
    if (errors.length > 0) {
      return res.status(400).json({ status: "failed", message: errors[0], errors });
    }
    const payload = {
      sender_address_code,
      reciever_address_code,
      pickup_date,
      category_id,
      package_items,
      service_type: service_type || "pickup",
      delivery_instructions: delivery_instructions || "",
      package_dimension
    };

    console.log("Payload for fetch rates: ", payload);
    const response = await axios.post(
      "https://api.shipbubble.com/v1/shipping/fetch_rates",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`
        }
      }
    );
    return res.json({
      status: "success",
      data: response.data.data
    });
  } catch (err) {
    console.log("Fetch general rates error:", err.response?.data || err.message);
    return res.status(500).json({
      status: "failed",
      message: "Could not fetch rates",
      error: err.response?.data || err.message
    });
  }
};


exports.fetchSelectedCourierRates = async (req, res) => {
  try {
    const { service_codes } = req.params;
    const {
      sender_address_code,
      reciever_address_code,
      pickup_date,
      category_id,
      package_items,
      package_dimension,
      service_type,
      delivery_instructions
    } = req.body;
    const errors = [];
    if (!sender_address_code) errors.push("Sender address code is required");
    if (!reciever_address_code) errors.push("Receipient address code is required");
    if (!pickup_date) errors.push("Pickup date is required");
    if (!category_id) errors.push("Please select a package category");
    if (!package_items || package_items.length === 0) errors.push("Package items are required");
    if (!package_dimension) errors.push("Package dimension is required");
    if (errors.length > 0) {
      return res.status(400).json({ status: "failed", message: errors[0], errors });
    }
    const payload = {
      sender_address_code,
      reciever_address_code,
      pickup_date,
      category_id,
      package_items,
      service_type: service_type || "pickup",
      delivery_instructions: delivery_instructions || "",
      package_dimension
    };
    const response = await axios.post(
      `https://api.shipbubble.com/v1/shipping/fetch_rates/${service_codes}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`
        }
      }
    );
    return res.json({ status: "success", data: response.data.data });
  } catch (err) {
    console.log("Fetch selected courier error:", err.response?.data || err.message);
    return res.status(500).json({
      status: "failed",
      message: "Could not fetch courier-specific rate",
      error: err.response?.data || err.message
    });
  }
};
/**
 * POST /api/logistics/create-shipment
 * Body: { request_token, service_code, courier_id, is_cod_label?, is_invoice_required?, items: [ {name, description, weight, amount, quantity} ] }
 */

exports.createShipment = async (req, res) => {
  try {
    const { request_token, service_code, courier_id, orderId } = req.body;
    // Validate required fields
    if (!request_token || !service_code || !courier_id) {
      return res.status(400).json({
        status: "fail",
        message: "request_token, service_code and courier_id are required"
      });
    }
    // Build payload (only required fields)
    const payload = {
      request_token,
      service_code,
      courier_id
    };
    // ShipBubble API request
    const sbRes = await axios.post(
      "https://api.shipbubble.com/v1/shipping/labels",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
          "Content-Type": "application/json"
        },
      }
    );
    console.log("Tracking url :", sbRes.data.data.tracking_url);

    await Order.findByIdAndUpdate(orderId, { tracking_url: sbRes.data.data.tracking_url }, { new: true });
    
    return res.status(200).json({
      status: "success",
      message: "Shipment created successfully",
      data: sbRes.data
    });
  } catch (error) {
    console.error("ShipBubble Create Shipment Error:", error.response?.data || error);
    return res.status(500).json({
      status: "error",
      message: "Could not create shipment",
      details: error.response?.data || error.message
    });
  }
};
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


