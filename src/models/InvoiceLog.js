// models/InvoiceLog.js
const mongoose = require('mongoose');

const invoiceLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["invoice", "receipt"], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("InvoiceLog", invoiceLogSchema);
