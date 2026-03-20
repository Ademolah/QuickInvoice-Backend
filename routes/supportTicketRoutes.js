// routes/supportRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { getSupportHistory, sendMessage, markAsRead } = require('../controllers/supportTicketController');

// GET /api/support/history - Fetch previous messages
router.get('/history', auth, getSupportHistory);

// POST /api/support/send - Send a message with context
router.post('/send', auth, sendMessage);

// PUT /api/support/read - Mark messages as seen
router.put('/read', auth, markAsRead);



module.exports = router;