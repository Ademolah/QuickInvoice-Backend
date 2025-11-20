const mongoose = require("mongoose");



const shipmentSchema = new mongoose.Schema({
  order_id: String,
  request_token: String,
  courier_id: String,
  service_code: String,
  shipbubble_response: mongoose.Schema.Types.Mixed,
  status: String,
  tracking_url: String,
  payment: mongoose.Schema.Types.Mixed,
  ship_from: mongoose.Schema.Types.Mixed,
  ship_to: mongoose.Schema.Types.Mixed,
  items: [mongoose.Schema.Types.Mixed],
}, { timestamps: true });



module.exports = mongoose.model("Shipment", shipmentSchema);