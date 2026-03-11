const Expense = require("../models/Expenses");
const mongoose = require("mongoose");
const User = require("../models/Users")

/**
 * CREATE EXPENSE
 */
exports.createExpense = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    const expense = await Expense.create({
      ...req.body,
      userId: req.userId,
      businessId: user.activeBusinessId,
    });

    // Helpful for debugging the new fields
    console.log(`Expense Record: ${expense.title} | Taxable: ${expense.isTaxDeductible} | Recurring: ${expense.isRecurring}`);
    
    res.status(201).json({
      success: true,
      expense,
    });
  } catch (err) {
    console.error("Create expense error:", err);
    res.status(500).json({ message: "Failed to create expense" });
  }
};

/**
 * GET EXPENSES (optionally by month)
 */
exports.getExpenses = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const user = await User.findById(req.userId)

    let filter = { 
      userId: req.userId,
      businessId: user.activeBusinessId // 👈 THE FILTER: Keeps costs separated
    };

    if (month) {
      const [year, m] = month.split("-");
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 1);
      filter.expenseDate = { $gte: start, $lt: end };
    }
    const expenses = await Expense.find(filter).sort({ expenseDate: -1 });
    res.json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (err) {
    console.error("Fetch expenses error:", err);
    res.status(500).json({ message: "Failed to fetch expenses" });
  }
};

/**
 * DELETE EXPENSE
 */
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Delete expense error:", err);
    res.status(500).json({ message: "Failed to delete expense" });
  }
};

exports.getExpensesByMonth = async (req, res) => {
  try {
    const { month } = req.query; // expected format: YYYY-MM
    const user = await User.findById(req.userId)
    
    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required (YYYY-MM)",
      });
    }
    const [year, m] = month.split("-");
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 1);

    const expenses = await Expense.find({
      userId: req.userId,
      businessId: user.activeBusinessId, // 👈 THE FILTER: Keeps the monthly report clean
      expenseDate: { $gte: startDate, $lt: endDate },
    }).sort({ expenseDate: -1 });

    res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Get expenses by month error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses by month",
    });
  }
};


exports.getExpenseStats = async (req, res) => {
  try {
    // 1. Fetch user to find the current active context
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2. Build the match query dynamically
    // If activeBusinessId is null, we match records where businessId is also null
    const businessMatch = user.activeBusinessId 
      ? new mongoose.Types.ObjectId(user.activeBusinessId) 
      : null;

    const stats = await Expense.aggregate([
      { 
        $match: { 
          userId: new mongoose.Types.ObjectId(req.userId),
          businessId: businessMatch // 👈 THE FILTER: Scopes the math to the active business
        } 
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          taxableAmount: {
            $sum: { $cond: [{ $eq: ["$isTaxDeductible", true] }, "$amount", 0] }
          }
        }
      }
    ]);

    const result = stats.length > 0 ? stats[0] : { totalAmount: 0, taxableAmount: 0 };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Aggregation Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};