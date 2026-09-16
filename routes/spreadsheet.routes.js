const express = require('express');
const { getLedger, syncLedger } = require('../controllers/spreadsheet.controller');
const auth = require('../middleware/authMiddleware'); // Adjust path based on your folder structure

const router = express.Router();

// Apply auth middleware to all spreadsheet routes
router.use(auth);

router.get('/', getLedger);
router.put('/sync', syncLedger);

module.exports = router;