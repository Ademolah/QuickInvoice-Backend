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
        from: '"QuickInvoice NG" <hi@hqbinary.com>',
        to: email,
        subject: "Welcome email",
        text: "Hello world?", // plain‑text body
        html: `
           <p>Welcome to Quickinvoice ${name}</p>
       `,
    });

    console.log("✅ Welcome email sent via Resend", info.messageId );
    // console.log("Message sent:", info.messageId);
    })();
    } catch (error) {
        console.error("❌ Failed to send email:", error);
    }

}

module.exports = sendWelcomeEmail