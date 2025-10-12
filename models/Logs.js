const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  message: { type: String, required: true },
  level: { type: String, enum: ['info','warn','error'], default: 'info' },
  meta: {
    userId: { type: String },
    email: { type: String },
    name: { type: String },
    adminId: { type: String },
    endpoint: { type: String },
    reason: { type: String },
    loginAt: { type: Date },
    logoutAt: { type: Date },
    duration: { type: Number }, // in seconds
  },
  createdAt: { type: Date, default: Date.now, index: true }
});
module.exports = mongoose.model('Log', logSchema);