const Activity = require('../models/Activity');

const activityTracker = (req, res, next) => {
  res.on('finish', async () => {
    const user = req.user || req.admin;
    // 🛡️ Ensure we have a user and the request didn't fail (4xx/5xx)
    if (!user || res.statusCode >= 400) return;

    const path = req.originalUrl.toLowerCase();
    const method = req.method;

    // 🛑 BLOCK NOISE: Filter out background polling and stats
    if (
      path.includes('platform-feed') || 
      path.includes('admin/stats') || 
      path.includes('notifications')
    ) return;

    // --- MAP THE ACTION ---
    let action = "Active on Dashboard";
    let category = "system";

    if (path.includes('login')) { action = "User Logged In"; category = "auth"; }
    else if (path.includes('support')) { action = "Support Interaction"; category = "support"; }
    else if (path.includes('invoice')) { action = "Billing/Invoices"; category = "finance"; }
    else if (path.includes('checkout')) { action = "Payment Processing"; category = "finance"; }
    else if (path.includes('marketsquare')) { action = "Browsing Marketplace"; category = "system"; }

    try {
      // 🚀 THE DATABASE SAVER (UPSERT LOGIC)
      // Check for an existing log for this user created in the last 5 minutes
      const windowTime = new Date(Date.now() - 5 * 60 * 1000);

      await Activity.findOneAndUpdate(
        { 
          userId: user._id, 
          createdAt: { $gte: windowTime } 
        },
        { 
          // Update these fields
          userName: user.name || user.email,
          userEmail: user.email,
          action: action,
          category: category,
          metadata: { 
            route: path.split('?')[0], 
            method: method,
            role: user.role || 'user'
          },
          // Refresh the timestamp to keep it "Live" on the frontend
          createdAt: new Date() 
        },
        { 
          upsert: true, // Create if doesn't exist, Update if it does
          new: true 
        }
      );
    } catch (err) {
      console.error('Audit Log Error:', err.message);
    }
  });
  next();
};

module.exports = activityTracker;