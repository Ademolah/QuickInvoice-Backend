const cron = require("node-cron");
const User = require("../models/Users");


function startSubscriptionExpiryCron() {
  cron.schedule("0 0 * * *", async () => {
    // Runs daily at midnight
    const now = new Date();
    const expiredUsers = await User.find({
      plan: "pro",
      proExpires: { $lte: now },
    });
    for (const user of expiredUsers) {
      user.plan = "free";
      user.proExpires = null;
      await user.save();
      console.log(":arrow_down: Downgraded expired user:", user.email);
    }
  });
}
module.exports = startSubscriptionExpiryCron;