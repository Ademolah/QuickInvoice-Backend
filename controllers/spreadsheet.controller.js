const Spreadsheet = require('../models/SpreadSheet');

/**
 * @desc    Get user's active sales spreadsheet
 * @route   GET /api/spreadsheet
 * @access  Private
 */
const getLedger = async (req, res) => {
  try {
    // Extracted from your auth middleware
    const userId = req.userId; 

    const ledger = await Spreadsheet.findOne({ userId });

    if (!ledger) {
      // If first time, return an empty array so frontend can initialize its default empty row
      return res.status(200).json({ success: true, data: { rows: [] } });
    }

    return res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    console.error('Error fetching spreadsheet:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving ledger' });
  }
};

/**
 * @desc    Sync (Upsert) the entire spreadsheet state
 * @route   PUT /api/spreadsheet/sync
 * @access  Private
 */
const syncLedger = async (req, res) => {
  try {
    const userId = req.userId;
    const { rows } = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of rows.' });
    }

    // findOneAndUpdate with { upsert: true } will update if it exists, or create if it doesn't.
    const updatedLedger = await Spreadsheet.findOneAndUpdate(
      { userId },
      { $set: { rows } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({ 
      success: true, 
      message: 'Ledger synced successfully', 
      data: updatedLedger 
    });
  } catch (error) {
    console.error('Error syncing spreadsheet:', error);
    return res.status(500).json({ success: false, message: 'Server error saving ledger' });
  }
};

module.exports = {
  getLedger,
  syncLedger
};