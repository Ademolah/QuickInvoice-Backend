const cron = require("node-cron");
const User = require("../models/Users");



function startSubscriptionExpiryCron() {
  cron.schedule("0 0 * * *", async () => {
    const now = new Date();

    try {
      // Find anyone whose specific plan date has passed
      const expiredUsers = await User.find({
        $or: [
          { plan: "pro", proExpires: { $lte: now } },
          { plan: "enterprise", enterpriseExpires: { $lte: now } }
        ]
      });

      if (expiredUsers.length === 0) return;

      for (const user of expiredUsers) {
        user.plan = "free";
        user.proExpires = null;
        user.enterpriseExpires = null;
        await user.save();
        
        console.log(`📉 Downgraded: ${user.email} (Subscription ended)`);
      }
    } catch (e) {
      console.error("Cron Error:", e);
    }
  });
}


module.exports = startSubscriptionExpiryCron;