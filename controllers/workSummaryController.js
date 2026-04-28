const WorkSummary = require('../models/WorkSummary');
const Invoice = require('../models/Invoice');

// @desc    Create a new Summary of Work
// @route   POST /api/summaries
exports.createWorkSummary = async (req, res) => {
  try {
    const { 
      projectTitle, clientName, workDescription, 
      keyDeliverables, completionDate, optionalNotes, linkedInvoice 
    } = req.body;

    // 1. Verify the linked invoice exists and belongs to the user
    const invoice = await Invoice.findOne({ _id: linkedInvoice, userId: req.userId });
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Linked invoice not found or unauthorized" });
    }

    // 2. Create the summary
    const summary = await WorkSummary.create({
      userId: req.userId,
      projectTitle,
      clientName,
      workDescription,
      keyDeliverables,
      completionDate,
      optionalNotes,
      linkedInvoice
    });

    res.status(201).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all summaries for the logged-in user
exports.getMySummaries = async (req, res) => {
  try {
    const summaries = await WorkSummary.find({ userId: req.userId })
      .populate('linkedInvoice', 'invoiceNumber totalAmount status') // Pulling key invoice info
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: summaries.length, data: summaries });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single summary details
exports.getSummaryById = async (req, res) => {
  try {
    const summary = await WorkSummary.findOne({ _id: req.params.id, userId: req.userId })
      .populate('linkedInvoice');

    if (!summary) return res.status(404).json({ message: "Summary not found" });

    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};