// // models/Payment.js
// const mongoose = require('mongoose')

// const PaymentSchema = new mongoose.Schema(
//   {
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     amount: Number,
//     reference: String,
//     status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
//   },
//   { timestamps: true }
// );

// module.exports= mongoose.model("Payment", PaymentSchema);

// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
//   amount: { type: Number, required: true }, // kobo
//   currency: { type: String, default: 'NGN' },
//   reference: { type: String, required: true, unique: true },
//   status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
//   description: { type: String },
//   authUrl: { type: String },
//   metadata: { type: Object },
// }, { timestamps: true });

// module.exports = mongoose.model('Payment', paymentSchema);

// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
//   reference: { type: String, required: true, unique: true, index: true },
//   amount: { type: Number, required: true }, // in NGN (not kobo) for easier display
//   currency: { type: String, default: 'NGN' },
//   description: { type: String },
//   status: { type: String, enum: ['pending','success','failed','abandoned'], default: 'pending' },
//   authorization_url: { type: String },
//   initPayload: { type: Object },
//   verifyPayload: { type: Object },
//   webhookPayload: { type: Object },
//   paidAt: { type: Date },
// }, { timestamps: true });

// module.exports = mongoose.model('Payment', paymentSchema);

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

