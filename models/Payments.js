// // models/Payment.js


// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reference: { type: String, unique: true },
//   amount: { type: Number, required: true },
  description: String,
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);

