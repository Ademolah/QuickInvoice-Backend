const express = require('express');
const crypto = require('crypto');
const paystack = require('../utils/paystack');
const Payment = require('../models/Payments');
const User = require('../models/Users');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Create or refresh subaccount for the current user from stored accountDetails.
 * Expects user.accountDetails to contain bankName, accountNumber, accountName.
 * For live integration, pass bank_code; or use a map for popular banks below.
 */
const BANK_CODE_MAP = {
  'Access Bank': '044',
  'GTBank': '058',
  'First Bank': '011',
  'Zenith Bank': '057',
  'United Bank for Africa': '033',
  'Union Bank': '032',
  'FCMB': '214',
  'Fidelity Bank': '070',
  'Sterling Bank': '232',
  'Keystone Bank': '082',
  'Polaris Bank': '076',
  'Wema Bank': '035',
  'Kuda': '50211',
  'Opay': '999992', // update with valid code if needed
};

router.post('/subaccount', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { accountDetails, businessName, email } = user;
    if (!accountDetails?.bankName || !accountDetails?.accountNumber || !accountDetails?.accountName) {
      return res.status(400).json({ message: 'Missing bank account details on user profile' });
    }

    const bank_code = BANK_CODE_MAP[accountDetails.bankName] || req.body.bank_code;
    if (!bank_code) {
      return res.status(400).json({ message: 'Unknown bank. Provide bank_code in body.' });
    }

    // If subaccount exists, update it; else create new
    if (user.subaccountCode) {
      const update = await paystack.put(`/subaccount/${user.subaccountCode}`, {
        business_name: businessName || accountDetails.accountName,
        settlement_bank: bank_code,
        account_number: String(accountDetails.accountNumber),
        percentage_charge: 0, // QuickInvoice takes fee as platform if needed; adjust if using split fees
      });
      return res.json({ subaccount: update.data.data });
    }

    const create = await paystack.post('/subaccount', {
      business_name: businessName || accountDetails.accountName,
      settlement_bank: bank_code,
      account_number: String(accountDetails.accountNumber),
      percentage_charge: 0, // platform fee can be configured later
      primary_contact_email: email,
      metadata: { quickinvoice_user: user._id.toString() }
    });

    user.subaccountCode = create.data.data.subaccount_code;
    await user.save();

    res.json({ subaccount: create.data.data });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ message: 'Failed to create/update subaccount' });
  }
});

/**
 * Initialize a payment.
 * Body: { amount, description }
 * Uses user.subaccountCode for split settlement and user.email for customer email.
 */
router.post('/initiate', auth, async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ message: 'Amount required' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.subaccountCode) return res.status(400).json({ message: 'No subaccount yet. Create one first.' });

    const amountInKobo = Math.round(Number(amount) * 100);

    const init = await paystack.post('/transaction/initialize', {
      email: user.email,
      amount: amountInKobo,
      currency: 'NGN',
      subaccount: user.subaccountCode,
      bearer: 'subaccount', // subaccount bears Paystack fees; adjust to 'account' if platform bears fees
      metadata: {
        quickinvoice_user: user._id.toString(),
        description: description || 'NFC Payment'
      }
    });

    const { authorization_url, reference } = init.data.data;

    await Payment.create({
      userId: user._id,
      amount: amountInKobo,
      reference,
      description: description || 'NFC Payment',
      status: 'pending',
      authUrl: authorization_url
    });

    res.json({ authorization_url, reference });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
});

/**
 * Verify a payment by reference
 */
router.get('/verify/:reference', auth, async (req, res) => {
  try {
    const { reference } = req.params;
    const verify = await paystack.get(`/transaction/verify/${reference}`);
    const data = verify.data.data;

    const status = data.status === 'success' ? 'success' : (data.status === 'failed' ? 'failed' : 'pending');

    const payment = await Payment.findOneAndUpdate(
      { reference },
      { status, metadata: data },
      { new: true }
    );

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ message: 'Verification failed' });
  }
});

/**
 * Webhook (remember to set raw body for this route in server.js)
 */
router.post('/nfcWebhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(req.body).digest('hex');
    if (signature !== hash) return res.status(401).send('Invalid signature');

    const event = JSON.parse(req.body.toString());
    if (event?.event === 'charge.success') {
      const ref = event.data.reference;
      await Payment.findOneAndUpdate({ reference: ref }, { status: 'success', metadata: event.data });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
