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
    const userId = req.userId; 
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. SURGICAL INJECTION: Extract the new frontend filter parameters
    const { filterType, customMonth, type, category } = req.query;

    let query = { 
      userId: userId, 
      businessId: user.activeBusinessId 
    };

    // 2. TIMING LOGIC: Dynamically calculate boundaries for the MongoDB query
    const now = new Date();
    let queryStartDate, queryEndDate;

    if (filterType === 'this-month') {
      // First day of current month to the absolute last millisecond of the month
      queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
    } else if (filterType === 'this-week') {
      // Calculates the most recent Sunday to Saturday boundary
      const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      firstDayOfWeek.setHours(0, 0, 0, 0);
      
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);

      queryStartDate = firstDayOfWeek;
      queryEndDate = lastDayOfWeek;

    } else if (filterType === 'custom' && customMonth) {
      // Expects customMonth in "YYYY-MM" format (e.g., "2026-06")
      const [year, month] = customMonth.split('-');
      queryStartDate = new Date(year, parseInt(month) - 1, 1);
      queryEndDate = new Date(year, parseInt(month), 0, 23, 59, 59, 999);
    }

    // 3. Apply the dynamic timing filter (skips entirely if filterType is "all")
    if (queryStartDate && queryEndDate) {
      query.date = { $gte: queryStartDate, $lte: queryEndDate };
    }

    // Advanced Filtering Logic
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