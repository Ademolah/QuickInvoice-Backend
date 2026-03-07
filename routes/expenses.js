const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  createExpense,
  getExpenses,
  deleteExpense,
  getExpensesByMonth,
  getExpenseStats
} = require("../controllers/expensesController");

router.post("/", auth, createExpense);
router.get("/", auth, getExpenses);
router.get("/by-month", auth, getExpensesByMonth);
router.delete("/:id", auth, deleteExpense);
router.get("/stats/summary", auth, getExpenseStats);

module.exports = router;
