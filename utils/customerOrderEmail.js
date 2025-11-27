const nodemailer = require("nodemailer");


const sendOrderConfirmationEmail = async(buyerName,orderId, email,orderDate, vendorBusinessName, buyerAddress, subtotal,deliveryFee, totalAmount, orderName, orderQuantity, trackingUrl)=>{
    
        
    
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
        subject: "Order Confirmed",
        text: "Hello world?", // plain‑text body
        html: `
          <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Your Order is Confirmed - Market Zone</title>
</head>
<body style="margin:0; padding:0; background:#F9FAFB; font-family:Inter, Arial, sans-serif; color:#4B5563;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:600px; background:#FFFFFF; border-radius:12px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05); overflow:hidden;"
  >
    <!-- Header -->
    <tr>
      <td align="center" style="background:linear-gradient(90deg,#00B86B,#0046A5); padding:20px;">
        <h1 style="margin:0; font-family:Poppins, Arial, sans-serif; font-size:22px; color:#FFFFFF;">
          Order Confirmation
        </h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:30px;">
        <p style="font-size:16px; line-height:1.6; margin:0 0 16px;">
          Hi <strong>${buyerName}</strong>, your order has been successfully placed!
        </p>
        <p style="font-size:15px; margin:0 0 25px;">
          Thank you for shopping on <strong>Market Zone</strong>. Below are your order details:
        </p>
        <!-- Order Details Table -->
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;"><strong>Vendor:</strong></td>
            <td style="padding:8px 0;">${vendorBusinessName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Order Name:</strong></td>
            <td style="padding:8px 0;">${orderName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Order Quantity:</strong></td>
            <td style="padding:8px 0;">${orderQuantity}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Order ID:</strong></td>
            <td style="padding:8px 0;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Tracking URL:</strong></td>
            <td style="padding:8px 0;">${trackingUrl}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Date:</strong></td>
            <td style="padding:8px 0;">${orderDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;"><strong>Delivery Address:</strong></td>
            <td style="padding:8px 0;">${buyerAddress}</td>
          </tr>
        </table>
        <!-- Order Summary -->
        <h3 style="font-family:Poppins; font-size:18px; margin:30px 0 10px;">Order Summary</h3>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;">Subtotal:</td>
            <td style="padding:8px 0;">₦${subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;">Delivery Fee:</td>
            <td style="padding:8px 0;">₦${deliveryFee.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; font-weight:bold;">Total Paid:</td>
            <td style="padding:8px 0; font-weight:bold; color:#00B86B;">
              ₦${totalAmount.toLocaleString()}
            </td>
          </tr>
        </table>
        <p style="margin-top:25px; font-size:15px;">
          Your vendor will process your order shortly. You will receive further updates as your order moves.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px; background:#F9FAFB;">
        <center>
          <p style="margin:0; font-size:13px; color:#6B7280; text-align:center;">
            © 2025 QuickInvoice NG. All rights reserved.
          </p>
        </center>
      </td>
    </tr>
  </table>
</body>
</html>
       `,
    });

    console.log("✅ Order confirmation email sent via Resend", info.messageId );
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendOrderConfirmationEmail