// models/SupportTicket.js
const mongoose = require('mongoose');


const supportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessContext: { type: String }, // e.g., "Charles Logistics"
  status: { type: String, enum: ['open', 'pending', 'resolved'], default: 'open' },
  messages: [{
    sender: { type: String, enum: ['user', 'support','admin'] },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', supportSchema);