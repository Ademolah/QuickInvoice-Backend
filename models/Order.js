const mongoose = require("mongoose");


const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }, // vendor owner
  buyerName: String,
  buyerEmail: String,
  buyerPhone: String,
  items: { type: Array, default: [] }, // array of { productId?, name, qty, price }
  amount: { type: Number, required: true }, // in kobo or naira? we'll store in kobo for clarity
  currency: { type: String, default: "NGN" },
  paystackReference: String,
  paystackAuthorizationUrl: String,
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  metadata: { type: Object, default: {} },
}, { timestamps: true });


module.exports = mongoose.model("Order", orderSchema);