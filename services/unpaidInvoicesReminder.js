const Invoice = require("../models/Invoice");
const User = require("../models/Users");
const nodemailer = require('nodemailer')
const generateInvoiceReminderEmail = require("../utils/generateInvoiceReminderEmail")


const FOUR_DAYS = 1000 * 60 * 60 * 24 * 4;

// const FOUR_DAYS = 1000 * 60 * 2


async function sendUnpaidInvoiceReminders() {
  console.log("🔁 Running unpaid invoice reminder job...");

  

  
  const now = new Date();
  // find unpaid (sent) invoices
  const invoices = await Invoice.find({ status: "sent" })
    .populate("userId", "email name");
  for (const invoice of invoices) {
    const lastUpdated = invoice.updatedAt || invoice.createdAt;
    // only remind every 4 days
    if (now - lastUpdated < FOUR_DAYS) continue;
    const invoiceUser = invoice.userId;
    const user = await User.findById(invoiceUser._id);
    if (!user?.email) continue;
    const html = generateInvoiceReminderEmail({
      businessName: user.businessName,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      clientPhone: invoice.clientPhone,
      total: invoice.total,
      outstandingBalance: invoice.outstandingBalance,
    });
    try {

        const transporter = nodemailer.createTransport({
                host: "smtp.resend.com",
                port: 465,
                secure: true, // true for 465, false for other ports
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY,
                },
        });


        await transporter.sendMail({
        from: `"QuickInvoice NG" <support@quickinvoiceng.com>`,
        to: user.email,
        subject: "Unpaid Invoice Reminder",
        html,
    });
    console.log(`📧 Reminder sent for invoice ${invoice._id}`);
    } catch (error) {
        console.log("Failed to send email:", error);
    }
  }
}


module.exports = sendUnpaidInvoiceReminders;