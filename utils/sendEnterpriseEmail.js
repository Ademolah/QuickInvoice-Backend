const nodemailer = require("nodemailer");


const sendSubscriptionEmail = async(name, email)=>{
    
        
    
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
  <title>Enterprise Access Activated</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F4F7FA; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:32px; overflow:hidden; border: 1px solid #E2E8F0; box-shadow: 0 25px 50px -12px rgba(0, 40, 174, 0.12);">
    
    <tr>
      <td style="background:#0028AE; padding:14px 40px; text-align:center;">
        <span style="color:#FFFFFF; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:2px;">Corporate Access • Enterprise Tier</span>
      </td>
    </tr>

    <tr>
      <td style="padding:48px 40px 32px 40px; text-align:center;">
        <div style="height:72px; width:72px; background:#EEF2FF; border-radius:24px; display:inline-block; text-align:center; line-height:72px; margin-bottom:24px;">
          <span style="font-size:32px;">🏢</span>
        </div>
        <h1 style="font-size:32px; font-weight:800; letter-spacing:-1.5px; margin:0; color:#0F172A; line-height:1.2;">
          Welcome to <span style="color:#0028AE;">Enterprise Ops</span>.
        </h1>
        <p style="margin:16px 0 0 0; font-size:16px; color:#475569; line-height:1.6;">
          Hello ${name}, you have successfully unlocked <strong>Multi-Business Infrastructure</strong>. Your ecosystem is now unified and secured.
        </p>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 32px 40px;">
        <div style="background:#F8FAFC; border: 1px solid #E2E8F0; border-radius:24px; padding:24px;">
          <h3 style="margin:0 0 16px 0; font-size:12px; font-weight:800; color:#94A3B8; text-transform:uppercase; letter-spacing:1px;">Enterprise Account Summary</h3>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#64748B;">Plan Level</td>
              <td align="right" style="padding:8px 0; font-size:14px; font-weight:700; color:#0F172A;">Enterprise Monthly</td>
            </tr>
            <tr>
              <td style="padding:8px 0; font-size:14px; color:#64748B;">Primary Admin</td>
              <td align="right" style="padding:8px 0; font-size:14px; font-weight:700; color:#0F172A;">${email}</td>
            </tr>
            <tr>
              <td style="padding:16px 0 0 0; border-top: 1px solid #E2E8F0; font-size:14px; font-weight:700; color:#0028AE;">Network Status</td>
              <td align="right" style="padding:16px 0 0 0; border-top: 1px solid #E2E8F0; font-size:14px; font-weight:800; color:#0028AE;">MULTI-TENANCY ACTIVE</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px 40px;">
        <p style="margin:0 0 20px 0; font-size:14px; font-weight:800; color:#0F172A; text-transform:uppercase; letter-spacing:1px; text-align:center;">Enterprise Capabilities Unlocked:</p>
        <table width="100%" cellspacing="0" cellpadding="10">
          <tr>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">🔀 Multi-Business</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">Seamless context switching.</p>
            </td>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">🏷️ Custom Branding</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">Unique identity per entity.</p>
            </td>
          </tr>
          <tr>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">🏦 Isolated Ledgers</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">Separate bookkeeping.</p>
            </td>
            <td width="50%" style="background:#FFFFFF; border: 1px solid #F1F5F9; border-radius:16px;">
              <p style="margin:0; font-size:13px; font-weight:700; color:#1E293B;">♾️ Unlimited Scale</p>
              <p style="margin:4px 0 0 0; font-size:11px; color:#64748B;">Zero caps on operations.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 40px 48px 40px;">
        <a href="https://quickinvoiceng.com/dashboard" 
           style="display:inline-block; width:100%; box-sizing:border-box; padding:20px; background:#0F172A; color:#FFFFFF; text-decoration:none; border-radius:18px; font-size:16px; font-weight:700; text-align:center;">
           Launch Enterprise Console
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:40px; background:#F8FAFC; border-top: 1px solid #E2E8F0;">
        <div style="height:32px; width:32px; background:#0028AE; border-radius:8px; display:inline-block; text-align:center; line-height:32px; margin-bottom:16px;">
          <span style="color:#FFFFFF; font-weight:800; font-size:16px; font-style:italic;">Q</span>
        </div>
        <p style="margin:0; font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:2px;">QuickInvoice Enterprise • 2026 Edition</p>
        <p style="margin:10px 0 0 0; font-size:11px; color:#94A3B8;">
          Abuja, Nigeria • Scalable Financial Architecture
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