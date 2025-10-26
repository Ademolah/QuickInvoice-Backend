const cron = require("node-cron");
const User = require("../models/Users");
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
    from: '"QuickInvoice NG" <hi@quickinvoiceng.com>',
    to: user.email,
    subject: "⏰ Your Pro plan expires soon",
    html: `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Subscription Reminder</title>
</head>
<body style="margin:0; padding:0; background-color:#F9FAFB; font-family:Inter, Arial, sans-serif; color:#4B5563;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#FFFFFF; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background:linear-gradient(90deg,#0046A5,#00B86B); padding:20px;">
        <h1 style="margin:0; font-family:Poppins, Arial, sans-serif; font-size:24px; color:#FFFFFF;">QuickInvoice NG</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:30px;">
        <h2 style="font-family:Poppins, Arial, sans-serif; font-size:22px; margin:0; color:#0046A5;">
          Subscription Expiring Soon ⌛
        </h2>
        <p style="margin:16px 0; font-size:16px; line-height:1.6;">
          Hi <strong>${user.name}</strong>,
        </p>
        <p style="margin:0 0 16px 0; font-size:16px; line-height:1.6;">
          Your <strong>Pro subscription</strong> for <strong>${user.businessName}</strong> will expire in <strong>4 days</strong>.
        </p>
        <p style="margin:0 0 20px 0; font-size:16px; line-height:1.6;">
          To avoid any interruption in your access to premium features, please renew your subscription today.
        </p>
        <div style="text-align:center; margin:30px 0;">
          <a href="https://quickinvoiceng.com/billing"
             style="display:inline-block; padding:12px 24px; background:#00B86B; color:#FFFFFF; text-decoration:none; border-radius:8px; font-size:16px; font-weight:600;">
             Renew Now
          </a>
        </div>
        <p style="margin:20px 0 0 0; font-size:15px; color:#6B7280;">
          Thank you for choosing QuickInvoice NG — helping businesses grow smarter every day.
        </p>
        <p style="margin-top:8px; font-size:15px; color:#6B7280;">
          Warm regards,<br/>
          <strong>The QuickInvoice NG Team</strong>
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="padding:20px; font-size:13px; color:#6B7280; background:#F9FAFB;">
        © 2025 QuickInvoice NG. All rights reserved. <br/>
        <a href="https://quickinvoiceng.com/privacy" style="color:#0046A5; text-decoration:none;">Privacy Policy</a> •
        <a href="https://quickinvoiceng.com/terms" style="color:#0046A5; text-decoration:none;">Terms of Use</a>
      </td>
    </tr>
  </table>
</body>
</html>
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
