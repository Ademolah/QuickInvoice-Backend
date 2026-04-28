const express = require('express');
const router = express.Router();
const { 
  createWorkSummary, 
  getMySummaries, 
  getSummaryById 
} = require('../controllers/workSummaryController');
const auth = require('../middleware/authMiddleware'); // Assuming you have auth middleware

router.route('/')
  .post(auth, createWorkSummary)
  .get(auth, getMySummaries);

router.route('/:id')
  .get(auth, getSummaryById);

module.exports = router;