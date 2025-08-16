const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: {type: Number, required: true, unique: true},
  businessName: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  accountDetails: {
  bankName: { type: String },
  accountNumber: { type: String },
  accountName: { type: String }
},
plan: { type: String, enum: ["free", "pro"], default: "free" },
  usage: {
    invoicesThisMonth: { type: Number, default: 0 },
    receiptsThisMonth: { type: Number, default: 0 },
    lastReset: { type: Date, default: Date.now }
  },
  plan: { type: String, enum: ['free','pro'], default: 'free' },
  proExpires: { type: Date, default: null },
  
}, {timestamps: true});

module.exports = mongoose.model('User', userSchema);