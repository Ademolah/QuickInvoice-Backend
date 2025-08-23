// const mongoose = require("mongoose");

// const activitySchema = new mongoose.Schema({
//   userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//   type: { type: String, enum: ["payment", "invoice", "receipt"], required: true },
//   description: { type: String, required: true },
//   amount: { type: Number },
//   status: { type: String, enum: ["success", "failed"], default: "success" },
//   reference: { type: String },
//   createdAt: { type: Date, default: Date.now }
// });

// module.exports = mongoose.model("Activity", activitySchema);

// models/ActivityLog.js
import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: String,
    type: { type: String, enum: ["payment", "invoice", "general"], default: "general" },
  },
  { timestamps: true }
);

export default mongoose.model("ActivityLog", ActivityLogSchema);

