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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Keep Your Intelligence Active</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
    .feature-lock { border-left: 3px solid #E2E8F0; padding-left: 15px; margin-bottom: 15px; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:24px; overflow:hidden; border: 1px solid #E2E8F0; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);">
    
    <tr>
      <td style="background:#0F172A; padding:20px 40px; text-align:center;">
        <span style="color:#94A3B8; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:2px;">Subscription Priority Notice</span>
      </td>
    </tr>

    <tr>
      <td style="padding:40px;">
        <h2 style="font-size:28px; font-weight:800; letter-spacing:-1px; margin:0; color:#0F172A; line-height:1.2;">
          Don't lose your <span style="color:#0028AE;">Intelligence Suite</span>.
        </h2>
        <p style="margin:24px 0; font-size:16px; line-height:1.6; color:#475569;">
          Hi ${user.name}, your Pro access for <strong>${user.businessName}</strong> is set to expire in <span style="color:#E11D48; font-weight:700;">4 days</span>. 
        </p>

        <div style="background:#FFF1F2; border-radius:16px; padding:20px; margin:30px 0;">
          <h3 style="margin:0 0 12px 0; font-size:14px; font-weight:800; color:#9F1239; text-transform:uppercase; letter-spacing:0.5px;">What happens next?</h3>
          <p style="margin:0; font-size:14px; color:#BE123C; line-height:1.5;">
            To maintain "World-Class" operations, a renewal is required. Without Pro, the following features will be paused:
          </p>
          <ul style="margin:12px 0 0 0; padding-left:20px; font-size:13px; color:#9F1239; line-height:1.8;">
            <li><strong>Automated Bookkeeping & Ledger access</strong></li>
            <li><strong>Real-time Inventory Synchronization</strong></li>
            <li><strong>High-Fidelity PDF Exports</strong></li>
            <li><strong>Unlimited Invoices & Receipts</strong></li>
          </ul>
        </div>

        <div style="text-align:center; margin:40px 0;">
          <a href="https://quickinvoiceng.com/billing" 
             style="display:inline-block; padding:18px 36px; background:#0028AE; color:#FFFFFF; text-decoration:none; border-radius:16px; font-size:16px; font-weight:700; box-shadow: 0 10px 15px -3px rgba(0, 40, 174, 0.2);">
             Secure My Pro Status
          </a>
          <p style="margin-top:20px; font-size:12px; color:#94A3B8;">Fast, secure renewal via Paystack</p>
        </div>

        <p style="margin:0; font-size:14px; color:#64748B; border-top: 1px solid #F1F5F9; pt: 20px;">
          If you have already renewed or updated your billing, please disregard this automated notice.
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:30px; background:#F8FAFC; color:#94A3B8; border-top: 1px solid #E2E8F0;">
        <div style="height:32px; width:32px; background:#E2E8F0; border-radius:8px; display:inline-block; text-align:center; line-height:32px; margin-bottom:15px;">
          <span style="color:#94A3B8; font-weight:800; font-size:16px; font-style:italic;">Q</span>
        </div>
        <p style="margin:0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">QuickInvoice NG • 2026</p>
        <p style="margin:10px 0 0 0; font-size:11px;">
          <a href="#" style="color:#64748B; text-decoration:none;">Billing Support</a> • 
          <a href="#" style="color:#64748B; text-decoration:none;">Legal</a> • 
          <a href="#" style="color:#64748B; text-decoration:none;">Privacy</a>
        </p>
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
