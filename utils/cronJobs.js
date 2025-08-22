const cron = require("node-cron");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// setup nodemailer transporter (replace with your config)
const transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: "resend",
            pass: process.env.RESEND_API_KEY,
        },
});

function sendReminderEmail(user) {
  const mailOptions = {
    from: '"QuickIncoice NG" <hi@hqbinary.com>',
    to: user.email,
    subject: "⏰ Your Pro plan expires soon",
    html: `
      <h2>Hi ${user.name},</h2>
      <p>Your <b>Pro subscription</b> for <b>${user.businessName}</b> will expire in <b>4 days</b>.</p>
      <p>To avoid interruption, please renew your subscription today.</p>
      <br/>
      <a href="https://quickinvoiceng.com/billing" 
         style="background:#0046A5; color:white; padding:10px 20px; text-decoration:none; border-radius:6px;">
         Renew Now
      </a>
      <br/><br/>
      <p>– The QuickInvoice NG Team</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}

// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("🔍 Checking for expiring subscriptions...");

  const now = new Date();
  const reminderDate = new Date(now);
  reminderDate.setDate(reminderDate.getDate() + 4); // 4 days from now

  // Find users whose proExpires is exactly 4 days away
  const users = await User.find({
    plan: "pro",
    proExpires: {
      $gte: new Date(reminderDate.setHours(0, 0, 0, 0)),
      $lte: new Date(reminderDate.setHours(23, 59, 59, 999)),
    },
  });

  console.log(`📧 Found ${users.length} users with expiring subs in 4 days.`);

  for (let user of users) {
    try {
      await sendReminderEmail(user);
      console.log(`✅ Reminder sent to ${user.email}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${user.email}:`, err.message);
    }
  }
});
