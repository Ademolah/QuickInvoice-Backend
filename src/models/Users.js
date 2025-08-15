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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);