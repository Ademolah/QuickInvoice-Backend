const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }, // optional tie to invoice
    pickupAddress: { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    receiverName: { type: String, required: true },
    receiverPhone: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "in_transit", "delivered", "cancelled"],
      default: "pending",
    },
    price: { type: Number, default: 0 }, // auto-calculated later
    assignedDriver: { type: String }, // placeholder until we add driver model
  },
  { timestamps: true }
);

module.exports = mongoose.model("Delivery", DeliverySchema);
