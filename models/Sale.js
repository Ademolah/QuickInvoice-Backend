const mongoose = require('mongoose');


const SaleSchema = new mongoose.Schema({
  // --- OFFLINE SYNC CORE ---
  // clientTxnId: The 'Idempotency Key'. Generated on the frontend.
  // This prevents duplicate sales if the sync request is sent multiple times.
  clientTxnId: { 
    type: String, 
    unique: true, 
    required: true,
    index: true 
  },
  
  // offlineCreatedAt: The actual time the sale happened in the shop.
  // We use this for financial reports instead of the server's 'createdAt'.
  offlineCreatedAt: { type: Date, required: true },

  isOfflineSynced: { type: Boolean, default: false },

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