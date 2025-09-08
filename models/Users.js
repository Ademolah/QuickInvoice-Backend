const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: {type: String, required: true, unique: true},
  businessName: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  accountDetails: {
  bankName: { type: String },
  accountNumber: { type: String },
  accountName: { type: String }
},// from Paystack
plan: { type: String, enum: ["free", "pro"], default: "free" },
usage: {
    invoicesThisMonth: { type: Number, default: 0 },
    receiptsThisMonth: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },
  proExpires: { type: Date, default: null },

  currency: {
  type: String,
  enum: ["NGN", "USD", "GBP", "EUR"], // extendable
  default: "NGN"
}

  
}, {timestamps: true});

module.exports = mongoose.model('User', userSchema);