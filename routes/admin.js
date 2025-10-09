const express = require('express');
const router = express.Router();
const sendMonthlyReport = require('../utils/reportSummary')
router.get('/test-report', async (req, res) => {
  try {
    await sendMonthlyReport('adeakinyemi@gmail.com'); // <-- your test email
    res.json({ message: 'Test monthly report sent successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send test report' });
  }
});

module.exports = router;