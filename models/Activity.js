const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  // WHO: Essential for the UI and filtering
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  userName: { type: String, required: true },
  userEmail: { type: String },

  // WHAT: The "Premium" display fields
  action: { type: String, required: true },    // e.g., "Created Invoice"
  category: { 
    type: String, 
    enum: ['auth', 'finance', 'support', 'inventory', 'system'], 
    default: 'system',
    index: true 
  },
  
  // WHERE: Metadata for debugging if needed
  metadata: {
    route: String,
    method: String,
    ip: String,
    documentId: String // ID of the invoice/ticket/product changed
  },

  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('Activity', activitySchema);