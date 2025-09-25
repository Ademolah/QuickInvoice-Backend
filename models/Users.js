const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: {type: String, required: true, unique: true},
  dialCode: { type: String, required: false }, // e.g. +234, +1
  businessName: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  accountDetails: {
  bankName: { type: String },
  accountNumber: { type: String },
  accountName: { type: String }
},// from Paystack

tokenVersion: { type: Number, default: 0 },
//Avatar fields
avatar: {type:String},
avatarPublicId: {type: String},


plan: { type: String, enum: ["free", "pro"], default: "free" },
usage: {
    invoicesThisMonth: { type: Number, default: 0 },
    receiptsThisMonth: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },
  proExpires: { type: Date, default: null },

  currency: {
  type: String,
  enum: ["NGN", "USD", "GBP", "EUR", "TRY"], // extendable
  default: "NGN"
}

  
}, {timestamps: true});

module.exports = mongoose.model('User', userSchema);