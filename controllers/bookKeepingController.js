const Transaction = require('../models/BookKeepingTransactions');
const User = require('../models/Users');

// @desc    Record a new income/expense
exports.addTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, date, referenceId, paymentMethod } = req.body;

    const userId = req.userId;  
    const user = await User.findById(userId);

    const transaction = new Transaction({
      userId: userId,
      businessId: user.activeBusinessId,
      type,
      amount,
      category,
      description,
      date,
      referenceId,
      paymentMethod
    });

    await transaction.save();
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ message: "Transaction recording failed", error: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    // 1. FIX: Use req.userId (matching your auth middleware)
    const userId = req.userId; 
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const { startDate, endDate, type, category } = req.query;

    // 2. FIX: Consistent userId and activeBusinessId handling
    let query = { 
      userId: userId, 
      businessId: user.activeBusinessId // Mongoose handles null if switching to Main
    };

    // Advanced Filtering Logic
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (type) query.type = type;
    if (category) query.category = category;

    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    // Quick Math for the Frontend Intelligence Cards
    const stats = transactions.reduce((acc, curr) => {
      if (curr.type === 'INCOME') acc.totalIncome += curr.amount;
      else acc.totalExpense += curr.amount;
      return acc;
    }, { totalIncome: 0, totalExpense: 0 });

    res.json({
      success: true,
      count: transactions.length,
      stats: {
        ...stats,
        netProfit: stats.totalIncome - stats.totalExpense
      },
      data: transactions
    });
  } catch (error) {
    // This will now catch the specific error and tell you exactly what's wrong
    console.error("Bookkeeping Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch ledger", error: error.message });
  }
};

// @desc    Delete transaction (Audit Protection)
exports.deleteTransaction = async (req, res) => {
  try {
    // 3. FIX: Use req.userId here as well
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    await transaction.deleteOne();
    res.json({ success: true, message: "Transaction removed from ledger" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};