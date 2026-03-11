const nodemailer = require("nodemailer");


const sendSubscriptionEmail = async(name, email, businessName)=>{
    
        
    
    try {

        // Create a test account or replace with real credentials.
        const transporter = nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: "resend",
            pass: process.env.RESEND_API_KEY,
        },
    });

    // Wrap in an async IIFE so we can use await.
    (async () => {
    const info = await transporter.sendMail({
        from: '"QuickInvoice NG" <hi@quickinvoiceng.com>',
        to: email,
        subject: "Subscription email",
        text: "Hello world?", // plain‑text body
        html: `
           <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Intelligence Upgrade is Active</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:32px; overflow:hidden; border: 1px solid #E2E8F0; box-shadow: 0 25px 50px -12px rgba(16, 185, 129, 0.15);">
    
    <tr>
      <td style="background:#10B981; padding:14px 40px; text-align:center;">
        <span style="color:#FFFFFF; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px;">Official Confirmation • Pro Tier</span>
      </td>
    </tr>

    <tr>
      <td style="padding:48px 40px 32px 40px; text-align:center;">
        <div style="height:72px; width:72px; background:#ECFDF5; border-radius:24px; display:inline-block; text-align:center; line-height:72px; margin-bottom:24px;">
          <span style="font-size:32px;">🛡️</span>
        </div>
        <h1 style="font-size:32px; font-weight:800; letter-spacing:-1.5px; margin:0; color:#0F172A; line-height:1.2;">
          Welcome to <span style="color:#10B981;">Pro Intelligence</span>.
        </h1>
        <p style="margin:16px 0 0 0; font-size:16px; color:#475569; line-height:1.6;">
          Hello ${name}, your business <strong>${businessName}</strong> is now operating at full capacity. Your elite membership is officially active.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px 40px;">
        <div style="background:#F8FAFC; border: 1px solid #E2E8F0; border-radius:24px; padding:24px;">
          <h3 style="margin:0 0 16px 0; font-size:12px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:1px;">Subscription Details</h3>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#64748B;">Plan Level</td>
              <td align="right" style="padding:8px 0; font-size:14px; font-weight:700; color:#0F172A;">Pro Annual</td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#64748B;">Account Identity</td>
              <td align="right" style="padding:8px 0; font-size:14px; font-weight:700; color:#0F172A;">${email}</td>
            </tr>
            <tr>
              <td style="padding:16px 0 0 0; border-top: 1px solid #E2E8F0; font-size:14px; font-weight:700; color:#10B981;">Status</td>
              <td align="right" style="padding:16px 0 0 0; border-top: 1px solid #E2E8F0; font-size:14px; font-weight:800; color:#10B981;">ACTIVE & SECURED</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px 40px;">
        <p style="margin:0 0 20px 0; font-size:14px; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:1px; text-align:center;">Unlocked Superpowers:</p>
        <table width="100%" cellspacing="0" cellpadding="10">
          <tr>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">📈 Financial Ledger</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">Automated P&L tracking.</p>
            </td>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">💎 Unlimited Suite</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">No caps on growth.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 40px 48px 40px;">
        <a href="https://quickinvoiceng.com/" 
           style="display:inline-block; width:100%; box-sizing:border-box; padding:20px; background:#0F172A; color:#FFFFFF; text-decoration:none; border-radius:18px; font-size:16px; font-weight:700; text-align:center;">
           Enter Pro Dashboard
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:40px; background:#F8FAFC; border-top: 1px solid #E2E8F0;">
        <div style="height:32px; width:32px; background:#0028AE; border-radius:8px; display:inline-block; text-align:center; line-height:32px; margin-bottom:16px;">
          <span style="color:#FFFFFF; font-weight:800; font-size:16px; font-style:italic;">Q</span>
        </div>
        <p style="margin:0; font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:2px;">QuickInvoice • 2026 Edition</p>
        <p style="margin:10px 0 0 0; font-size:11px; color:#94A3B8;">
          Abuja, Nigeria • Secure Business Operations
        </p>
      </td>
    </tr>
  </table>
</body>
</html>

       `,
    });

    console.log("✅ Subscription email sent via Resend", info.messageId );
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendSubscriptionEmail