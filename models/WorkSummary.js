const mongoose = require('mongoose');

const workSummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  summaryNumber: {
    type: String,
    required: true,
    unique: true,
    default: () => `SOW-${Math.floor(1000 + Math.random() * 9000)}`
  },
  projectTitle: {
    type: String,
    required: [true, "Project title is mandatory"],
    trim: true
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  workDescription: {
    type: String,
    required: true
  },
  keyDeliverables: [{
    type: String, // Array of strings for clean bullet points in the PDF
  }],
  completionDate: {
    type: Date,
    required: true
  },
  optionalNotes: {
    type: String,
    trim: true
  },
  linkedInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice', // Relational link to your existing Invoice model
    required: [true, "A Summary of Work must be anchored to an Invoice"]
  },

  businessId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User.enterpriseBusinesses',
        default: null // null means it belongs to the "Main" account
    },

  status: {
    type: String,
    enum: ['draft', 'finalized', 'shared'],
    default: 'draft'
  }
}, { timestamps: true });

module.exports = mongoose.model('WorkSummary', workSummarySchema);