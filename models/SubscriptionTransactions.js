const mongoose = require('mongoose');

const SubscriptionTransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // Name of the user at time of purchase
  plan: { type: String, enum: ['pro', 'enterprise'], required: true },
  amount: { type: Number, required: true }, // 3000 or 10000
  currency: { type: String, default: 'NGN' },
  status: { type: String, default: 'success' },
  date: { type: Date, default: Date.now },
  reference: { type: String, unique: true } // Payment gateway reference (Paystack/Flutterwave)
});

module.exports = mongoose.model('SubscriptionTransaction', SubscriptionTransactionSchema);