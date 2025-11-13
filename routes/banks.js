const express = require('express');
const router = express.Router();
const axios = require('axios');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY; 


// GET /api/banks
router.get('/', async (req, res) => {
  try {
    const resp = await axios.get('https://api.paystack.co/bank', {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      params: { country: 'nigeria' }
    });
    // resp.data.data is an array of banks { name, code, slug, type, id, currency }
    res.json({ success: true, banks: resp.data.data });
  } catch (err) {
    console.error('Error fetching banks:', err.response?.data || err.message);
    // fallback: return a small list or empty array
    res.status(500).json({ success: false, message: 'Failed to fetch banks', error: err.response?.data || err.message });
  }
});
module.exports = router;