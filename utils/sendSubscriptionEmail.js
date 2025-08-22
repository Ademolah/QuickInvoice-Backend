const nodemailer = require("nodemailer");


const sendWelcomeEmail = async(name, email)=>{
    // const owner = await User.findById(slot.userId)
        
    // console.log(owner.email);
        
    
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
        subject: "Welcome email",
        text: "Hello world?", // plain‑text body
        html: `
           <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Subscription Successful</title>
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
        <h2 style="font-family:Poppins, Arial, sans-serif; font-size:22px; margin:0; color:#00B86B;">Subscription Successful 🎉</h2>
        <p style="margin:16px 0; font-size:16px; line-height:1.6;">
          Hi <strong>${name}</strong>,  
          your subscription has been successfully activated with the email <strong>${email}</strong>.
        </p>

        <p style="margin:20px 0; font-size:16px;">
          You now have full access to all premium features of QuickInvoice NG. Start creating unlimited invoices today!
        </p>

        <a href="https://quickinvoice.ng/dashboard" 
           style="display:inline-block; padding:12px 24px; background:#00B86B; color:#FFFFFF; text-decoration:none; border-radius:8px; font-size:16px; font-weight:600;">
           Go to Dashboard
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="padding:20px; font-size:13px; color:#6B7280; background:#F9FAFB;">
        © 2025 QuickInvoice NG. All rights reserved.
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

module.exports = sendWelcomeEmail