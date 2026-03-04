
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

// console.log(process.env.RESEND_API_KEY);


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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Monthly Intelligence Brief</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F8FAFC; color:#1E293B;">
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; margin: 40px auto; background:#FFFFFF; border-radius:32px; overflow:hidden; border: 1px solid #E2E8F0; box-shadow: 0 25px 50px -12px rgba(0, 40, 174, 0.08);">
    
    <tr>
      <td style="padding:40px 40px 20px 40px;">
        <table width="100%">
          <tr>
            <td>
              <div style="height:36px; width:36px; background:#0028AE; border-radius:10px; display:inline-block; text-align:center; line-height:36px;">
                <span style="color:#FFFFFF; font-weight:800; font-size:18px; font-style:italic;">Q</span>
              </div>
            </td>
            <td align="right">
              <span style="font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; color:#94A3B8; background:#F1F5F9; padding:6px 12px; border-radius:20px;">
                ${new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px;">
        <h1 style="font-size:26px; font-weight:800; letter-spacing:-1px; margin:0; color:#0F172A;">Monthly Performance Brief</h1>
        <p style="margin:12px 0 0 0; font-size:15px; color:#64748B;">Excellent work this month, ${user.name}. Here is how <strong>${user.businessName}</strong> performed.</p>
      </td>
    </tr>

    <tr>
      <td style="padding:30px 40px;">
        <div style="background:linear-gradient(135deg, #0028AE 0%, #001A75 100%); border-radius:24px; padding:30px; text-align:center; color:#FFFFFF;">
          <p style="margin:0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:rgba(255,255,255,0.7);">Total Monthly Revenue</p>
          <h2 style="margin:10px 0 0 0; font-size:42px; font-weight:800; letter-spacing:-2px;">₦${stats.revenue.toLocaleString()}</h2>
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 30px 40px;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="31%" style="background:#F8FAFC; border-radius:16px; padding:15px; text-align:center; border: 1px solid #F1F5F9;">
              <p style="margin:0; font-size:10px; font-weight:800; color:#94A3B8; text-transform:uppercase;">Issued</p>
              <p style="margin:5px 0 0 0; font-size:18px; font-weight:800; color:#1E293B;">${stats.total}</p>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background:#F0FDF4; border-radius:16px; padding:15px; text-align:center; border: 1px solid #DCFCE7;">
              <p style="margin:0; font-size:10px; font-weight:800; color:#166534; text-transform:uppercase;">Paid</p>
              <p style="margin:5px 0 0 0; font-size:18px; font-weight:800; color:#15803d;">${stats.paid}</p>
            </td>
            <td width="3%"></td>
            <td width="31%" style="background:#FFF1F2; border-radius:16px; padding:15px; text-align:center; border: 1px solid #FFE4E6;">
              <p style="margin:0; font-size:10px; font-weight:800; color:#9F1239; text-transform:uppercase;">Unpaid</p>
              <p style="margin:5px 0 0 0; font-size:18px; font-weight:800; color:#BE123C;">${stats.unpaid}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px 40px;">
        <div style="border: 1px solid #F1F5F9; border-radius:24px; padding:20px; text-align:center;">
          <h3 style="margin:0 0 20px 0; font-size:13px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:1px; text-align:left;">Revenue Analytics</h3>
          <img src="${chartUrl}" alt="Performance Chart" style="width:100%; border-radius:12px; display:block;" />
        </div>
      </td>
    </tr>

    <tr>
      <td style="padding:0 40px 40px 40px; text-align:center;">
        <a href="https://quickinvoiceng.com" 
           style="display:inline-block; width:100%; box-sizing:border-box; padding:18px; background:#0F172A; color:#FFFFFF; text-decoration:none; border-radius:16px; font-size:15px; font-weight:700;">
           View Full Intelligence Report
        </a>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:40px; background:#F8FAFC; border-top: 1px solid #E2E8F0;">
        <p style="margin:0; font-size:11px; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:2px;">QuickInvoice Intelligence Suite</p>
        <p style="margin:10px 0 0 0; font-size:11px; color:#94A3B8;">
          You received this because you are an active Business Owner on our platform.
        </p>
        <div style="margin-top:20px; font-size:11px;">
            <a href="#" style="color:#0028AE; text-decoration:none; font-weight:700;">Dashboard</a> • 
            <a href="#" style="color:#0028AE; text-decoration:none; font-weight:700;">Support</a> • 
            <a href="#" style="color:#0028AE; text-decoration:none; font-weight:700;">Unsubscribe</a>
        </div>
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
      subject: `📊 Monthly Summary Report — ${new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleString("default", { month: "long" })}`,
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




