const nodemailer = require("nodemailer");


const sendOrderCorrespondenceEmail = async(buyerName,orderId, email,buyerPhone,orderDate, vendorBusinessName, buyerAddress, subtotal,deliveryFee, totalAmount, vendorPayout, orderName, orderQuantity, vendorPhone, buyerEmail, vendorEmail, trackingUrl)=>{
    
        
    
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
  <title>New Order - Market Zone</title>
</head>
<body style="margin:0; padding:0; background:#F9FAFB; font-family:Inter, Arial, sans-serif; color:#4B5563;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:600px; background:#FFFFFF; border-radius:12px;
    box-shadow:0 4px 12px rgba(0,0,0,0.05); overflow:hidden;"
  >
    <!-- Header -->
    <tr>
      <td align="center" style="background:linear-gradient(90deg,#0046A5,#00B86B); padding:20px;">
        <h1 style="margin:0; font-family:Poppins, Arial, sans-serif; font-size:22px; color:#FFFFFF;">
          New Order Received
        </h1>
      </td>
    </tr>
    <!-- Body -->
    <tr>
          <td style="padding:25px; font-size:15px; color:#374151; line-height:1.6;">
            <p style="margin:0 0 15px;">
              Hello Team,
            </p>
            <p style="margin:0 0 15px;">
              A new order has just been placed on <strong>Market Zone</strong>. 
              This email is for internal correspondence to keep vendor aware of new order from their stores
            </p>
            <!-- Order Summary -->
            <table style="width:100%; border-collapse:collapse;">
            <h3 style="font-size:17px; color:#0046A5; margin:20px 0 10px;">🧾Order Summary</h3>
            <tr>
                <tr>
                    <td style="padding:8px 0;"><strong>Item Ordered:</strong></td>
                    <td style="padding:8px 0;"><strong>${orderName}</strong></td>
                </tr>
                <tr>
                    <td style="padding:8px 0;"><strong>Quantity:</strong></td>
                    <td style="padding:8px 0;"><strong>${orderQuantity}</strong></td>
                </tr>
                <tr>
                    <td style="padding:8px 0;"><strong>Order ID:</strong></td>
                    <td style="padding:8px 0;"><strong>${orderId}</strong></td>
                </tr>
                <tr>
                    <td style="padding:8px 0;"><strong>Tracking URL:</strong></td>
                    <td style="padding:8px 0;"><strong>${trackingUrl}</strong></td>
                </tr>
                <p style="margin:0;"><strong>Status:</strong> Paid</p>
                <tr>
                    <td style="padding:8px 0;"><strong>order Date:</strong></td>
                    <td style="padding:8px 0;"><strong>${orderDate}</strong></td>
                </tr>
                <!-- Buyer Information -->
                <h3 style="font-size:17px; color:#0046A5; margin:20px 0 10px;">👤 Buyer Information</h3>
                    <tr>
                        <td style="padding:8px 0;"><strong>Buyer Name:</strong></td>
                        <td style="padding:8px 0;"><strong>${buyerName}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;"><strong>Buyer Phone:</strong></td>
                        <td style="padding:8px 0;"><strong>${buyerPhone}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;"><strong>Buyer Email:</strong></td>
                        <td style="padding:8px 0;">${buyerEmail}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;"><strong>Buyer Phone:</strong></td>
                        <td style="padding:8px 0;">${buyerPhone}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;"><strong>Delivery Address:</strong></td>
                        <td style="padding:8px 0;">${buyerAddress}</td>
                    </tr>
            </tr>
            </table>
            <!-- Vendor Information -->
            <h3 style="font-size:17px; color:#0046A5; margin:20px 0 10px;">🏪 Vendor Information</h3>
            <table style="width:100%; border-collapse:collapse;">
                <tr>
                    <td style="padding:8px 0;">Business Name:</td>
                    <td style="padding:8px 0;">${vendorBusinessName}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;">Email:</td>
                    <td style="padding:8px 0;">${vendorEmail}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;">Phone:</td>
                    <td style="padding:8px 0;">${vendorPhone}</td>
                </tr>
                <!-- Financial Breakdown -->
                <h3 style="font-size:17px; color:#0046A5; margin:20px 0 10px;">💰Financial Breakdown</h3>
                <tr>
                    <td style="padding:8px 0;">Subtotal:</td>
                    <td style="padding:8px 0;">₦${subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0;">Delivery Fee:</td>
                    <td style="padding:8px 0;">₦${deliveryFee.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; font-weight:bold;"><strong>Amount</strong></td>
                    <td style="padding:8px 0; font-weight:bold;">₦${totalAmount.toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="padding:8px 0; font-weight:bold;">Vendor Payout (10% fee):</td>
                    <td style="padding:8px 0; font-weight:bold; color:#00B86B;">₦${vendorPayout.toLocaleString()}</td>
                </tr>
            </table>
            <p style="margin-top:25px; font-size:15px;">
                This is an internal system notification. 
                Kindly contact the vendor to notify of new 
            </p>
          </td>
        <!-- Footer -->
        <tr>
        <td style="padding:20px; background:#F9FAFB;">
            <center>
            <p style="
                margin:0;
                font-size:13px;
                color:#6B7280;
                text-align:center;
            ">
            
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

    console.log("✅ order confirmation email sent via Resend", info.messageId );
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendOrderCorrespondenceEmail