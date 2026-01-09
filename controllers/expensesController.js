const Expense = require("../models/Expenses");

/**
 * CREATE EXPENSE
 */
exports.createExpense = async (req, res) => {
  try {
    const expense = await Expense.create({
      ...req.body,
      userId: req.userId,
    });
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
    let filter = { userId: req.userId };
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
