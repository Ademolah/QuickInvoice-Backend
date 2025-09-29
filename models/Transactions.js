const mongoose = require("mongoose");



const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionType: {
      type: String,
      enum: ["OUTBOUND_TRANSFER", "INBOUND_TRANSFER"],
      required: true,
    },
    transactionDetail: {
      name: { type: String },
      bank: { type: String },
      accountNumber: { type: String },
    },
    transactionAmount: {
        type: Number,
        default: 0,
    },
    transactionDescription: {
        type: String,
        default: null,
    },
    sessionId: {
        type: String,
        default: null
    },
    accountId: {
        type: String,
        default: null
    },
    currency: {
        type: String
    },
    
    transactionReference: {
        type: String,
        default: null,
    },
    transactionStatus: {
      type: String,
      enum: ["COMPLETED", "PENDING"],
      default: "PENDING",
    },
    accountBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);



module.exports = mongoose.model("Transaction", transactionSchema);