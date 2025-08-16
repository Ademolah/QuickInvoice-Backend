const User = require('../models/Users')



const checkUsage = async (req, res, next) => {
  const user = await User.findById(req.user.id);

  // Reset monthly usage if new month
  const now = new Date();
  if (new Date(user.usage.lastReset).getMonth() !== now.getMonth()) {
    user.usage.invoicesThisMonth = 0;
    user.usage.receiptsThisMonth = 0;
    user.usage.lastReset = now;
    await user.save();
  }

  if (user.plan === "free") {
    const totalUsage = user.usage.invoicesThisMonth + user.usage.receiptsThisMonth;
    if (totalUsage >= 20) {
      return res.status(403).json({ message: "Upgrade to Pro to issue more than 20 invoices/receipts per month." });
    }
  }

  next();
};

module.exports = checkUsage
