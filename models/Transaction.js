const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  method: { type: String, enum: ["NFC", "QR", "LINK"], required: true },
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  reference: { type: String, required: true, unique: true },
  note: { type: String },
  settledTo: { type: String }, // e.g., account number
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
