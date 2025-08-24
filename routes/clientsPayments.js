// routes/payments.js
const express = require('express');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/authMiddleware');
const User = require('../models/Users');

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PAYSTACK_BASE = 'https://api.paystack.co';

// helper
const paystack = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
});

// 1) Create subaccount ONCE
router.post('/subaccount', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.paystack?.subaccountCode) {
      return res.json({ subaccountCode: user.paystack.subaccountCode, alreadyExists: true });
    }

    const { bankName, accountNumber, accountName } = user.accountDetails || {};
    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ message: 'Missing bank details in accountDetails' });
    }

    // Paystack requires bank code, not bank name. For production, map bankName -> bank_code via their bank list API.
    // For now, if you already stored bank_code, use it instead of bankName.
    // Example: assume you stored bank_code in accountDetails.bankCode
    const bankCode = user.accountDetails.bankCode;
    if (!bankCode) {
      return res.status(400).json({ message: 'Missing bankCode; map bankName to bank_code and store in accountDetails.bankCode' });
    }

    const percentage_charge = 100 - (user.paystack?.splitPercentage ?? 98); // platform’s share (e.g. 2)
    const payload = {
      business_name: user.businessName,
      settlement_bank: bankCode,
      account_number: accountNumber,
      percentage_charge: percentage_charge, // percent the platform takes
    };

    const { data } = await paystack.post('/subaccount', payload);
    if (!data.status) return res.status(400).json({ message: data.message || 'Subaccount creation failed' });

    user.paystack.subaccountCode = data.data.subaccount_code;
    await user.save();

    res.json({ subaccountCode: data.data.subaccount_code, alreadyExists: false });
  } catch (err) {
    console.error('Subaccount error:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Server error creating subaccount' });
  }
});

// 2) Create payment link (initialize transaction) + return authorization_url
router.post(
  '/create-link',
  auth,
  body('amount').isNumeric().withMessage('Amount is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { amount, description } = req.body;
      const user = await User.findById(req.userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Ensure subaccount exists; if not, bail (or auto-create by calling /subaccount here)
      if (!user.paystack?.subaccountCode) {
        return res.status(400).json({ message: 'No subaccount for this user. Create it first.' });
      }

      // Paystack expects amount in kobo
      const kobo = Math.round(Number(amount) * 100);

      const initPayload = {
        amount: kobo,
        email: user.email,
        callback_url: `${FRONTEND_URL}/payments/callback`, // Create a simple page to show result
        metadata: {
          userId: String(user._id),
          businessName: user.businessName,
          description: description || 'Payment',
        },
        subaccount: user.paystack.subaccountCode, // route to merchant’s subaccount
        // optional: bearer: 'subaccount' (fees charged to subaccount instead)
      };

      const { data } = await paystack.post('/transaction/initialize', initPayload);
      if (!data.status) return res.status(400).json({ message: data.message || 'Failed to initialize' });

      res.json({
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      });
    } catch (err) {
      console.error('Create-link error:', err?.response?.data || err.message);
      res.status(500).json({ message: 'Server error initializing payment' });
    }
  }
);

// 3) Verify payment by reference (for polling)
router.get('/verify/:reference', auth, async (req, res) => {
  try {
    const { reference } = req.params;
    const { data } = await paystack.get(`/transaction/verify/${reference}`);
    res.json(data);
  } catch (err) {
    console.error('Verify error:', err?.response?.data || err.message);
    res.status(500).json({ message: 'Server error verifying transaction' });
  }
});

// 4) Webhook to confirm payment (configure on Paystack dashboard)
router.post('/webhook', express.json({ type: '*/*' }), (req, res) => {
  try {
    const hash = require('crypto')
      .createHmac('sha512', PAYSTACK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (req.headers['x-paystack-signature'] !== hash) {
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    // Handle events (charge.success, etc.)
    // Example:
    if (event.event === 'charge.success') {
      const ref = event.data.reference;
      // TODO: update your DB payments collection with status=success for ref
      console.log('Payment success for ref:', ref);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

module.exports = router;
