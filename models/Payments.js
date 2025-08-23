// models/Payment.js
import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    reference: String,
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", PaymentSchema);
