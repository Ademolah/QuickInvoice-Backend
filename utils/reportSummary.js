
// require("dotenv").config({path:"../.env"});
const cron = require("node-cron");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const User = require("../models/Users");
const Invoice = require("../models/Invoice");
// Connect to MongoDB

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});




// Configure transporter (Resend SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.RESEND_API_KEY,
  },
});


/**
 * Generate QuickChart URL dynamically (no canvas needed)
 */
const generateChartURL = (data) => {
  const chartConfig = {
    type: "bar",
    data: {
      labels: ["Total Issued", "Paid", "Unpaid"],
      datasets: [
        {
          label: "Monthly Summary",
          data,
          backgroundColor: ["#0046A5", "#00b86b", "#fbbf24"],
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Monthly Invoice Summary",
          color: "#111827",
          font: { size: 18 },
        },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  };
  // QuickChart.io API for generating image
  return `https://quickchart.io/chart?bkg=white&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
};
/**
 * Build HTML email body
 */
const buildEmail = (user, chartUrl, stats) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Monthly Summary Report</title>
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
        <h2 style="font-family:Poppins, Arial, sans-serif; font-size:22px; margin:0; color:#0046A5;">Monthly Report Summary</h2>
        <p style="margin:16px 0; font-size:16px; line-height:1.6;">
          Hi <strong>${user.name}</strong>,<br/>
          Here’s your performance summary for <b>${
  new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toLocaleString("default", { month: "long" })
}</b>:
        </p>
        <ul style="list-style:none; padding:0; font-size:15px; margin:20px 0;">
          <li>🧾 Total Invoices Issued: <b>${stats.total}</b></li>
          <li>💰 Total Paid: <b>${stats.paid}</b></li>
          <li>📄 Unpaid Invoices: <b>${stats.unpaid}</b></li>
          <li>💵 Total Revenue: <b>₦${stats.revenue.toLocaleString()}</b></li>
        </ul>
        <div style="text-align:center; margin:20px 0;">
          <img src="${chartUrl}" alt="Monthly Chart" style="max-width:100%; border-radius:8px;" />
        </div>
        <p style="margin:20px 0; font-size:15px;">
          Keep up the great work! Continue growing your business with QuickInvoice NG 🚀.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td align="center" style="padding:20px; font-size:13px; color:#6B7280; background:#F9FAFB;">
        © ${new Date().getFullYear()} QuickInvoice NG. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
`;
/**
 * Main monthly summary job
 */
const sendMonthlySummary = async () => {
  const users = await User.find({});
  

    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    for (const user of users) {
    const invoices = await Invoice.find({
      userId: user._id,
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
    });
    
    const total = invoices.length;
    const paid = invoices.filter((i) => i.status === "paid").length;
    const revenue = invoices.reduce((sum, i) => sum + (i.total || 0), 0);
    const unpaid = invoices.filter((i) => i.status === "sent").length;
    const chartUrl = generateChartURL([total, paid, unpaid]);

    await transporter.sendMail({
      from: '"QuickInvoice NG" <hi@quickinvoiceng.com>',
      to: user.email,
      subject: `📊 Monthly Summary Report — ${new Date().toLocaleString("default", { month: "long" })}`,
      html: buildEmail(user, chartUrl, { total, paid, unpaid, revenue }),
    });
    console.log(`✅ Summary email sent to ${user.email}`);
  }
};
/**
 * Schedule: 12:00 AM on the 1st of every month
 */
cron.schedule("0 0 1 * *", async () => {
  console.log("🗓️ Running monthly report summary job...");
  await sendMonthlySummary();
  console.log("✅ Monthly summary job completed.");
});


// (async () => {
//   console.log("🧪 Running test summary report...");
//   await sendMonthlySummary();
//   console.log("✅ Test summary report completed.");
//   process.exit(0);
// })();




