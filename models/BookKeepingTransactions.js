const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Optimized for fast dashboard loading
  },
  type: { 
    type: String, 
    enum: ['INCOME', 'EXPENSE'], 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    default: 'General',
    // Examples: Sales, Rent, Salary, Marketing, Software, Travel
  },
  amount: { 
    type: Number, 
    required: true,
    min: [0, 'Amount cannot be negative'] 
  },
  date: { 
    type: Date, 
    default: Date.now,
    required: true 
  },
  description: { 
    type: String, 
    trim: true,
    maxLength: 500 
  },
  referenceId: { 
    type: String, // Can store Invoice ID or Receipt Number
    trim: true 
  },
  attachmentUrl: { 
    type: String // URL for uploaded receipt images (S3/Cloudinary)
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Card', 'Other'],
    default: 'Bank Transfer'
  }
}, { timestamps: true });

// Indexing for high-performance date-range queries (Reports)
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('BookKeepingTransaction', transactionSchema);