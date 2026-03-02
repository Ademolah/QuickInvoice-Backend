const Notification = require('../models/Notifications');
const User = require('../models/Users');

exports.getUserNotifications = async (req, res) => {
  try {

    const user = await User.findById(req.userId);
    const now = new Date();

    // 1. Check Usage Logic (For Free Users)
    if (user.plan === 'free') {
      const totalUsage = (user.usage.invoicesThisMonth || 0) + (user.usage.receiptsThisMonth || 0);
      if (totalUsage >= 10 && totalUsage < 15) {
        // Upsert notification to avoid duplicates
        await Notification.findOneAndUpdate(
          { userId: user._id, type: 'USAGE_WARNING', createdAt: { $gte: new Date(user.usage.lastReset) } },
          { 
            title: 'Usage Limit Approaching',
            message: `You've used ${totalUsage}/15 free slots this month. Upgrade to Pro for unlimited access.`,
            createdAt: now 
          },
          { upsert: true }
        );
      }
    }

    // 2. Check Pro Expiry (For Pro Users - 10 days left)
    if (user.plan === 'pro' && user.proExpires) {
      const daysLeft = Math.ceil((new Date(user.proExpires) - now) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 10 && daysLeft > 0) {
        await Notification.findOneAndUpdate(
          { userId: user._id, type: 'PRO_EXPIRY', isRead: false },
          { 
            title: 'Pro Subscription Ending',
            message: `Your Pro plan expires in ${daysLeft} days. Renew now to maintain premium features.`,
            createdAt: now 
          },
          { upsert: true }
        );
      }
    }

    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  await Notification.updateMany({ userId: req.userId }, { isRead: true });
  res.json({ success: true });
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params; // Look for the ID in the URL
    
    if (id) {
      // Logic for clicking the checkmark on ONE notification
      await Notification.findByIdAndUpdate(id, { isRead: true });
    } else {
      // Logic for clicking "Clear All"
      await Notification.updateMany(
        { userId: req.user.id, isRead: false }, 
        { isRead: true }
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({ message: 'Error updating notifications' });
  }
};