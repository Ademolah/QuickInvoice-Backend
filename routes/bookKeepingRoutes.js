const express = require('express');
const router = express.Router();
const { addTransaction, getTransactions, deleteTransaction } = require('../controllers/bookKeepingController');
const auth = require('../middleware/authMiddleware'); 

router.use(auth); // Global protection for all bookkeeping routes

router.route('/')
  .post(addTransaction)
  .get(getTransactions);

router.route('/:id')
  .delete(deleteTransaction);

module.exports = router;