const mongoose = require('mongoose');

// Define the schema for a single row (no _id needed for subdocuments to keep it clean)
const SpreadsheetRowSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed, required: true }, // Mixed allows string or number (Date.now())
  date: { type: String, default: '' },
  units: { type: mongoose.Schema.Types.Mixed, default: '' },
  collector: { type: String, default: '' },
  description: { type: String, default: '' },
  sn: { type: String, default: '' },
  amount: { type: String, default: '' },
  remark: { type: String, default: '' }
}, { _id: false }); 

// Define the main document schema
const SpreadsheetSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true, // Enforces one master ledger per user
    index: true 
  },
  rows: { type: [SpreadsheetRowSchema], default: [] }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Spreadsheet', SpreadsheetSchema);