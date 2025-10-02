const nodemailer = require("nodemailer");


const sendDebitEmail = async(amount,bankName, email,accountName, accountNumber, dateTime, transactionReference)=>{
    
        
    
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
        subject: "Debit Alert",
        text: "Hello world?", // plain‑text body
        html: `
           <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Debit Alert - QuickInvoice NG</title>
</head>
<body style="margin:0; padding:0; background-color:#F9FAFB; font-family:Inter, Arial, sans-serif; color:#4B5563;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#FFFFFF; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); overflow:hidden;">
    <!-- Header -->
    <tr>
      <td align="center" style="background:linear-gradient(90deg,#0046A5,#FF4747); padding:20px;">
        <h1 style="margin:0; font-family:Poppins, Arial, sans-serif; font-size:22px; color:#FFFFFF;">Debit Alert</h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:30px;">
        <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
          A debit transaction has occurred on your QuickPay account.
        </p>
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
          <tr>
            <td style="padding:8px 0;"><strong>Amount:</strong></td>
            <td style="padding:8px 0;">₦${amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Bank Name:</strong></td>
            <td style="padding:8px 0;">${bankName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Account Name:</strong></td>
            <td style="padding:8px 0;">${accountName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Account Number:</strong></td>
            <td style="padding:8px 0;">${accountNumber}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Reference:</strong></td>
            <td style="padding:8px 0;">${transactionReference}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Date & Time:</strong></td>
            <td style="padding:8px 0;">${dateTime}</td>
          </tr>
        </table>
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

    console.log("✅ Debit email sent via Resend", info.messageId );
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendDebitEmail