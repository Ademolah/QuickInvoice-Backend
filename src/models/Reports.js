import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Total invoices sent in a given period
  invoicesCount: { type: Number, default: 0 },

  // Revenue for that period
  totalRevenue: { type: Number, default: 0 },

  // Paid vs Pending invoices
  paidInvoices: { type: Number, default: 0 },
  pendingInvoices: { type: Number, default: 0 },

  // Time period for report (monthly/weekly)
  period: {
    type: String,
    enum: ["daily", "weekly", "monthly", "yearly"],
    default: "monthly",
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  
}, {timestamps: true});

export default mongoose.model("Report", ReportSchema);
