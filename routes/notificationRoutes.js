const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require("../middleware/authMiddleware"); 

// All notification routes are private
router.use(auth);

// GET: /api/notifications - Fetches and calculates live usage alerts
router.get('/', notificationController.getUserNotifications);

// PUT: /api/notifications/read - Marks all as read when the bell is clicked
router.put('/read/', notificationController.markAsRead);

module.exports = router;