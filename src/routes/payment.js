// routes/payments.js
const express = require('express');
const axios = require('axios');
const protect = require('../middleware/authMiddleware'); // your protect
const User = require('../models/Users');
const crypto = require('crypto')

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PLAN_PRICE = Number(process.env.PLAN_PRICE_KOBO || 450000); // in kobo

// initialize transaction
router.post('/initialize', protect, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: user.email,
      amount: PLAN_PRICE, // in kobo
      callback_url: `${FRONTEND_URL}/billing/callback`, // customer returns here
      metadata: { userId } // save user id to metadata for verify
    }, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });

    // respond with authorization url and reference
    return res.json({ status: true, data: response.data.data });
  } catch (err) {
    console.error('Paystack initialize error', err.response?.data || err.message);
    return res.status(500).json({ status: false, message: 'Payment init failed' });
  }
});

// verify transaction and upgrade user
router.get('/verify/:reference', protect, async (req, res) => {
  try {
    const { reference } = req.params;

    const r = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
    });

    const data = r.data;
    if (!data || !data.status) return res.status(400).json({ success: false, message: 'Verification failed' });

    const tx = data.data;
    if (tx.status !== 'success') return res.status(400).json({ success: false, message: 'Payment not successful' });

    // metadata.userId was sent during initialization
    const metadata = tx.metadata || {};
    const userId = metadata.userId || (req.userId || req.user.id);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Extend proExpires by 30 days (or set to now + 30 days)
    const now = new Date();
    const currentExpiry = user.proExpires && user.proExpires > now ? new Date(user.proExpires) : now;
    const newExpiry = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);

    user.plan = 'pro';
    user.proExpires = newExpiry;
    await user.save();

    return res.json({ success: true, message: 'Upgraded to Pro', plan: 'pro', proExpires: user.proExpires });
  } catch (err) {
    console.error('verify error', err.response?.data || err.message);
    return res.status(500).json({ success: false, message: 'Verification error' });
  }
});

/**
 * Paystack webhook - recommended to use for automatic handling.
 * Important: use express.raw middleware on this route (see server setup).
 */
// router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   try {
//     // verify signature
//     const paystackSignature = req.headers['x-paystack-signature'];
//     const body = req.body; // raw body Buffer
//     const payload = body.toString()

//     const crypto = require('crypto');
//     const expected = crypto.createHmac('sha512', PAYSTACK_SECRET).update(payload).digest('hex');

//     if (paystackSignature !== expected) {
//       console.warn('Invalid Paystack signature');
//       return res.status(400).send('Invalid signature');
//     }

//     // const event = JSON.parse(payload); // safe because we used raw
//     let event;
//         try {
//         event = JSON.parse(payload);
//         } catch (e) {
//         console.error('Invalid JSON payload from Paystack', e);
//         return res.status(400).send('Invalid JSON');
//         }
//     const eventType = event.event;

//     // handle charge.success or payment.success (use event.data)
//     if (eventType === 'charge.success' || eventType === 'transaction.success') {
//       const tx = event.data;
//       // metadata.userId when we initialized transaction
//       const userId = tx.metadata?.userId;
//       if (userId) {
//         const user = await User.findById(userId);
//         if (user) {
//           // extend proExpires
//           const now = new Date();
//           const currentExpiry = user.proExpires && user.proExpires > now ? new Date(user.proExpires) : now;
//           user.plan = 'pro';
//           user.proExpires = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
//           await user.save();
//         }
//       }
//     }

//     // respond 200 quickly
//     res.status(200).json({ received: true }).send("Ok")
//   } catch (err) {
//     console.error('webhook error', err);
//     res.status(500).send('Server error');
//   }
// });

// router.post("/webhook", async (req, res) => {
//   try {
//     const event = req.body;

//     // Always respond immediately to Paystack to avoid retries
//     res.status(200).send("Webhook received");

//     if (event.event === "charge.success") {
//       const reference = event.data.reference;

//       // Verify transaction with Paystack
//       const verifyResponse = await axios.get(
//         `https://api.paystack.co/transaction/verify/${reference}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//           },
//         }
//       );

//       if (verifyResponse.data.status) {
//         const email = verifyResponse.data.data.customer.email;

//         // Find and update the user subscription
//         const user = await User.findOne({ email });
//         if (user) {
//           user.subscriptionPlan = "Pro";
//           user.subscriptionStatus = "active";
//           user.subscriptionExpiry = new Date(
//             Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
//           );
//           await user.save();
//           console.log(`✅ Subscription upgraded for ${email}`);
//         }
//       }
//     }
//   } catch (err) {
//     console.error("Webhook error", err.message);
//   }
// });


router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      // ✅ Verify signature
      const paystackSignature = req.headers['x-paystack-signature'];
      const payload = req.body.toString(); // raw body buffer to string
      const expected = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(payload)
        .digest('hex');

      if (paystackSignature !== expected) {
        console.warn('❌ Invalid Paystack signature');
        return res.status(400).send('Invalid signature');
      }

      // ✅ Parse event
      let event;
      try {
        event = JSON.parse(payload);
      } catch (e) {
        console.error('❌ Invalid JSON payload from Paystack', e);
        return res.status(400).send('Invalid JSON');
      }

      const eventType = event.event;

      // ✅ Handle payment success events
      if (eventType === 'charge.success' || eventType === 'transaction.success') {
        const tx = event.data;
        const userId = tx.metadata?.userId;

        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            const now = new Date();
            const currentExpiry =
              user.proExpires && user.proExpires > now
                ? new Date(user.proExpires)
                : now;

            user.plan = 'pro';
            user.proExpires = new Date(
              currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000
            ); // +30 days
            await user.save();

            console.log(`✅ User ${user.email} upgraded to Pro until ${user.proExpires}`);
          } else {
            console.warn(`⚠️ User not found for userId: ${userId}`);
          }
        } else {
          console.warn('⚠️ No userId found in transaction metadata');
        }
      }

      // ✅ Always return 200 fast so Paystack doesn’t retry
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('🔥 Webhook error', err);
      return res.status(500).send('Server error');
    }
  }
);

router.get("/callback", async (req, res) => {
  const reference = req.query.reference;

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (data.data.status === "success") {
      // Example: upgrade subscription
      await User.findOneAndUpdate(
        { email: data.data.customer.email },
        { subscription: "Pro", subscriptionExpiry: new Date(Date.now() + 30*24*60*60*1000) } // 30 days
      );

      return res.redirect("http://localhost:3000/dashboard?status=success");
    } else {
      return res.redirect("http://localhost:3000/dashboard?status=failed");
    }
  } catch (err) {
    console.error("Callback Verification Error:", err);
    res.redirect("http://localhost:3000/dashboard?status=error");
  }
});

module.exports = router;
