const User = require('../models/Users')


const checkUsage= async (req, res, next) => {
    try {
      const userId = req.userId || req.user.id;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      // Reset monthly usage if new month
      const now = new Date();
      if (!user.usage) user.usage = { invoicesThisMonth:0, receiptsThisMonth:0, lastReset: now };
      if (new Date(user.usage.lastReset).getMonth() !== now.getMonth()) {
        user.usage.invoicesThisMonth = 0;
        user.usage.receiptsThisMonth = 0;
        user.usage.lastReset = now;
        await user.save();
      }

      // check pro expiry
      if (user.plan === 'pro') {
        if (user.proExpires && new Date(user.proExpires) > now) {
          return next(); // still pro
        } else {
          // downgrade if expired
          user.plan = 'free';
          user.proExpires = null;
          await user.save();
        }
      }

      // now user.plan is 'free'
      const totalUsage = (user.usage.invoicesThisMonth || 0) + (user.usage.receiptsThisMonth || 0);
      const LIMIT = 20;
      if (totalUsage >= LIMIT) {
        return res.status(403).json({ message: 'Free plan limit reached. Upgrade to Pro.' });
      }

      next();
    } catch (err) {
      console.error('checkUsage error', err);
      res.status(500).json({ message: 'Server error' });
    }
  };


  module.exports = checkUsage

























  // const checkUsage = async (req, res, next) => {
//   const user = await User.findById(req.user.id);

//   // Reset monthly usage if new month
//   const now = new Date();
//   if (new Date(user.usage.lastReset).getMonth() !== now.getMonth()) {
//     user.usage.invoicesThisMonth = 0;
//     user.usage.receiptsThisMonth = 0;
//     user.usage.lastReset = now;
//     await user.save();
//   }

//   if (user.plan === "free") {
//     const totalUsage = user.usage.invoicesThisMonth + user.usage.receiptsThisMonth;
//     if (totalUsage >= 20) {
//       return res.status(403).json({ message: "Upgrade to Pro to issue more than 20 invoices/receipts per month." });
//     }
//   }

//   next();

// };

// module.exports = checkUsage
