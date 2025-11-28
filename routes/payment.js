// routes/payments.js
const express = require('express');
const axios = require('axios');
const protect = require('../middleware/authMiddleware'); // your protect
const User = require('../models/Users');
const crypto = require('crypto')
const sendSubscriptionEmail = require('../utils/sendSubscriptionEmail')
const Order = require('../models/Order')
const sendVendorEmail = require('../utils/vendorOrderEmail')
const sendCustomerOrderEmail = require('../utils/customerOrderEmail')
const sendOrderCorrespondenceEmail = require('../utils/sendCorrespondenceEmail')

const router = express.Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PLAN_PRICE = Number(process.env.PLAN_PRICE_KOBO); // in kobo
// const PLAN_PRICE = Number(process.env.PLAN_PRICE_KOBO || 50000); // in kobo

// initialize transaction
router.post('/initialize', protect, async (req, res) => {
  try {
    const userId = req.userId || req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const response = await axios.post('https://api.paystack.co/transaction/initialize', {
      email: user.email,
      amount: PLAN_PRICE, // in kobo
      // callback_url: `https://www.quickinvoiceng.com/billing`, // customer returns here
      callback_url: `${FRONTEND_URL}/billing`, // customer returns here
      metadata: { userId, type: "subscription" } // save user id to metadata for verify
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


// router.post('/initialize', protect, async (req, res) => {
//   try {
//     const userId = req.userId || req.user.id;
//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     const response = await axios.post('https://api.paystack.co/transaction/initialize', {
//       email: user.email,
//       amount: PLAN_PRICE, // in kobo
//       callback_url: `https://www.quickinvoiceng.com/billing`, // customer returns here
//       metadata: { userId } // save user id to metadata for verify
//     }, {
//       headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
//     });

//     // respond with authorization url and reference
//     return res.json({ status: true, data: response.data.data });
//   } catch (err) {
//     console.error('Paystack initialize error', err.response?.data || err.message);
//     return res.status(500).json({ status: false, message: 'Payment init failed' });
//   }
// });

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


// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   async (req, res) => {
//     try {
//       // ✅ Verify signature
//       const paystackSignature = req.headers['x-paystack-signature'];
//       const payload = req.body.toString(); // raw body buffer to string
//       const expected = crypto
//         .createHmac('sha512', PAYSTACK_SECRET)
//         .update(payload)
//         .digest('hex');

//       if (paystackSignature !== expected) {
//         console.warn('❌ Invalid Paystack signature');
//         return res.status(400).send('Invalid signature');
//       }

//       // ✅ Parse event
//       let event;
//       try {
//         event = JSON.parse(payload);
//       } catch (e) {
//         console.error('❌ Invalid JSON payload from Paystack', e);
//         return res.status(400).send('Invalid JSON');
//       }

//       const eventType = event.event;

//       // ✅ Handle payment success events
//       if (eventType === 'charge.success' || eventType === 'transaction.success') {
//         const tx = event.data;
//         const userId = tx.metadata?.userId;

//         if (userId) {
//           const user = await User.findById(userId);
//           if (user) {


//             const now = new Date();
//             const currentExpiry =
//               user.proExpires && user.proExpires > now
//                 ? new Date(user.proExpires)
//                 : now;

//             user.plan = 'pro';

            
//             user.proExpires = new Date(
//               currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000
//             ); // +30 days
            
//             // const now = new Date();

//             // const currentExpiry =
//             // user.proExpires && new Date(user.proExpires) > now
//             //     ? new Date(user.proExpires)
//             //     : now;

//             // user.plan = 'pro';

//             // user.proExpires = new Date(
//             // currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000
//             // ); // +30 days



//             await user.save();

//             await sendSubscriptionEmail(user.name, user.email)
//             console.log(`✅ User ${user.email} upgraded to Pro until ${user.proExpires}`);
//           } else {
//             console.warn(`⚠️ User not found for userId: ${userId}`);
//           }
//         } else {
//           console.warn('⚠️ No userId found in transaction metadata');
//         }
//       }

//       // ✅ Always return 200 fast so Paystack doesn’t retry
//       return res.status(200).json({ received: true });
//     } catch (err) {
//       console.error('🔥 Webhook error', err);
//       return res.status(500).send('Server error');
//     }
//   }
// );



router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // ===== VERIFY SIGNATURE =====
      const signature = req.headers["x-paystack-signature"];
      const rawBody = req.body.toString();
      const expected = crypto
        .createHmac("sha512", PAYSTACK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (signature !== expected) {
        console.warn(":x: Invalid signature");
        return res.status(400).send("Invalid signature");
      }
      // ===== PARSE EVENT =====
      let event;
      try {
        event = JSON.parse(rawBody);
      } catch (e) {
        return res.status(400).send("Invalid JSON");
      }
      const eventType = event.event;
      const tx = event.data;
      // ===== ONLY PROCESS SUCCESSFUL PAYMENTS =====
      if (eventType !== "charge.success" && eventType !== "transaction.success") {
        return res.status(200).send("Ignored");
      }
      const meta = tx.metadata || {};
      // ================================
      //  SUBSCRIPTION PAYMENT
      // ================================
      if (meta.type === "subscription") {
        const user = await User.findById(meta.userId);
        if (user) {
          const now = new Date();
          const currentExpiry =
            user.proExpires && user.proExpires > now
              ? new Date(user.proExpires)
              : now;
          user.plan = "pro";
          user.proExpires = new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000);
          await user.save();
          await sendSubscriptionEmail(user.name, user.email);
          console.log(":heavy_check_mark: Subscription upgraded for", user.email);
        }
        return res.status(200).send("Subscription handled");
      }
      // ================================
      //  MARKET ORDER PAYMENT
      // ================================
      if (meta.type === "market_order") {
        const order = await Order.findById(meta.orderId);
        const user = await User.findById(order.userId)
        const amount = order.amount/100
        const subtotal = order.items.reduce(
          (t, i) => t + ((Number(i.price) || 0) * (Number(i.qty) || 1)),
          0
        );

        const staffEmail = "aminadiallo645@gmail.com"
        const deliveryFee = Number(amount) - subtotal;
        const vendorPayout = Math.round((subtotal * 0.90) + deliveryFee);
        if (!order) {
          console.warn("⚠️ Order not found:", meta.orderId);
          return res.status(200).send("Order missing");
        }
        order.status = "paid";
        // order.shippingStatus = "shipped"
        await order.save();
        
        console.log(order);
        
        console.log("tracking url : ", order.tracking_url);
        
        console.log("🛒 Order marked PAID:", order._id);


         // -----------------------------------------
        // WAIT FOR SHIPMENT TRACKING URL (POLLING)
        // -----------------------------------------
        let trackingUrl = "";
        const maxWait = 15000; // 15 seconds
        const interval = 1500; // check every 1.5 seconds
        let waited = 0;
        while (!trackingUrl && waited < maxWait) {
          const refreshedOrder = await Order.findById(order._id);
          trackingUrl = refreshedOrder.tracking_url;
          if (trackingUrl) {
            console.log("🚚 Tracking URL ready:", trackingUrl);
            break;
          }
          console.log("⏳ Waiting for tracking URL...");
          await new Promise((resolve) => setTimeout(resolve, interval));
          waited += interval;
        }
        if (!trackingUrl) {
          console.log(" Tracking URL not found after wait. Sending emails without it.");
        }
        // -----------------------------------------
        // SEND EMAILS (NOW WITH trackingUrl IF READY)
        // -----------------------------------------

        await sendVendorEmail(order.buyerName, order._id, user.email, order.buyerPhone, order.createdAt, user.businessName, order.buyerAddress, subtotal, deliveryFee, amount, vendorPayout, order.items[0]?.name, order.items[0]?.qty, trackingUrl);
        await sendCustomerOrderEmail(order.buyerName, order._id, order.buyerEmail, order.createdAt, user.businessName, order.buyerAddress, subtotal, deliveryFee, amount, order.items[0]?.name, order.items[0]?.qty, trackingUrl);
        
        await new Promise((resolve)=> setTimeout(resolve, 7000)); // wait 5 seconds before sending staff email
        await sendOrderCorrespondenceEmail(order.buyerName, order._id, staffEmail, order.buyerPhone, order.createdAt, user.businessName, order.buyerAddress, subtotal, deliveryFee, amount, vendorPayout, order.items[0]?.name, order.items[0]?.qty, user.phone, order.buyerEmail, user.email, trackingUrl);
        return res.status(200).send("Order payment handled");
      }
      // ================================
      //  UNKNOWN TYPE
      // ================================
      console.warn("⚠️ Unknown payment metadata type");
      return res.status(200).send("Unknown type");
    } catch (err) {
      console.error(":fire: Webhook Error:", err);
      return res.status(500).send("Server Error");
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
