const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const supportController = require('../controllers/supportTicketController');
const auth = require('../middleware/authMiddleware'); // This must set req.user
const activityTracker = require('../middleware/trackActivity');

// 1. ALL admin routes require authentication
// This ensures req.user is set BEFORE anything else happens
router.use(auth); 

// 2. NOW mount the tracker
// It will now safely find req.user every time


// 3. Define the routes (Notice we removed 'auth' from each line to keep it DRY)
router.get('/stats', adminController.getGlobalStats);
router.get('/platform-feed', adminController.getPlatformFeed);

// Support Routes
router.get('/support/threads', supportController.adminGetAllThreads);
router.post('/support/reply', supportController.adminReply);
router.post('/support/mark-read', supportController.adminMarkRead);

module.exports = router;