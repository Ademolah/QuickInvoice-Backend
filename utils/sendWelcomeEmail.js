

const nodemailer = require("nodemailer");


const sendWelcomeEmail = async(name, email, businessName)=>{
    
        
    
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
        from: '"QuickInvoice NG" <hello@quickinvoiceng.com>',
        to: email,
        subject: "Welcome email",
        text: "Hello world?", // plain‑text body
        html: `
          <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to the Future of Your Business</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:24px; overflow:hidden; border: 1px solid #E2E8F0;">
    
    <tr>
      <td style="padding:40px 40px 20px 40px;">
        <table width="100%">
          <tr>
            <td>
              <div style="height:40px; width:40px; background:#0028AE; border-radius:12px; display:inline-block; text-align:center; line-height:40px;">
                <span style="color:#FFFFFF; font-weight:800; font-size:20px; font-style:italic;">Q</span>
              </div>
            </td>
            <td align="right">
              <span style="font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#94A3B8;">Identity Confirmed</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 40px;">
        <h1 style="font-size:32px; font-weight:800; letter-spacing:-1px; margin:0; color:#0F172A; line-height:1.2;">
          Elevate ${businessName}.
        </h1>
        <p style="margin:24px 0; font-size:16px; line-height:1.6; color:#475569;">
          Welcome, ${name}. You’ve just unlocked a high-performance suite designed to handle the complexity of your business so you can focus on the growth.
        </p>
        
        <a href="https://quickinvoiceng.com/" 
           style="display:inline-block; padding:16px 32px; background:#0028AE; color:#FFFFFF; text-decoration:none; border-radius:14px; font-size:15px; font-weight:600; shadow: 0 10px 15px -3px rgba(0, 40, 174, 0.3);">
           Launch Your Dashboard
        </a>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 40px;">
        <div style="padding:24px; background:#F1F5F9; border-radius:20px;">
          <h3 style="margin:0 0 16px 0; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:#64748B;">Ready to deploy:</h3>
          
          <table width="100%">
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-weight:700; color:#1E293B; font-size:14px;">⚡ Smart Invoicing</span>
                <p style="margin:4px 0 0 0; font-size:13px; color:#64748B;">Generate & send professional bills in 60 seconds.</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:12px;">
                <span style="font-weight:700; color:#1E293B; font-size:14px;">📦 Inventory Sync</span>
                <p style="margin:4px 0 0 0; font-size:13px; color:#64748B;">Stock levels update automatically as you sell.</p>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-weight:700; color:#1E293B; font-size:14px;">📊 Financial Ledger <span style="font-size:10px; background:#0028AE; color:#fff; padding:2px 6px; border-radius:4px; margin-left:5px;">PRO</span></span>
                <p style="margin:4px 0 0 0; font-size:13px; color:#64748B;">Real-time Profit & Loss tracking at a glance.</p>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:20px 40px 40px 40px;">
        <p style="margin:0; font-size:14px; color:#94A3B8;">
          Need assistance? Our concierge support is available at <a href="mailto:support@quickinvoiceng.com" style="color:#0028AE; text-decoration:none; font-weight:600;">support@quickinvoiceng.com</a>
        </p>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:30px; background:#0F172A; color:#64748B;">
        <p style="margin:0; font-size:12px; font-weight:600; letter-spacing:1px; text-transform:uppercase;">QuickInvoice Intelligence Suite</p>
        <p style="margin:8px 0 0 0; font-size:11px;">Lagos, Nigeria • 2026 Edition</p>
        <div style="margin-top:20px;">
            <a href="#" style="color:#94A3B8; text-decoration:none; font-size:11px; margin:0 10px;">Privacy</a>
            <a href="#" style="color:#94A3B8; text-decoration:none; font-size:11px; margin:0 10px;">Terms</a>
            <a href="#" style="color:#94A3B8; text-decoration:none; font-size:11px; margin:0 10px;">Unsubscribe</a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>

       `,
    });

    console.log(`✅ Welcome email sent via Resend to ${name}`);
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendWelcomeEmail