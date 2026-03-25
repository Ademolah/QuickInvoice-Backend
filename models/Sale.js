const mongoose = require('mongoose');


const SaleSchema = new mongoose.Schema({
  receiptNumber: { type: String, unique: true, required: true }, // e.g., QN-POS-2026-0001
  cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Products', required: true },
    name: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },

  businessId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User.enterpriseBusinesses',
      default: null // null means it belongs to the "Main" account
    },

  paymentDetails: {
    method: { type: String, enum: ['Cash', 'POS-Card', 'Transfer'], required: true },
    amountTendered: Number, // What the customer gave (for Cash)
    changeDue: Number,      // What the cashier returned
    transactionRef: String  // Bank Transfer Ref or POS Terminal Ref
  },
  status: { type: String, default: 'Completed' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });



module.exports = mongoose.model('Sale', SaleSchema);