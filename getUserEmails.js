// // scripts/getUserEmails.js
// const mongoose = require("mongoose");
// const User = require("./models/Users"); // adjust path to your User model

// //const MONGO_URI = "mongodb://localhost:27017/quickinvoiceng"; // 🔹 replace with your DB URI
// //const MONGO_URI = "mongodb+srv://mackelvinn:3WP3kR8uvRdJlPSZ@cluster0.ptzjg3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

// // const MONGO_URI = "mongodb+srv://mackelvinn:3WP3kR8uvRdJlPSZ@cluster0.ptzjg3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


// (async () => {
//   try {
//     await mongoose.connect(MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });

//     const users = await User.find({}, "email"); // only fetch email field
//     const emails = users.map(u => u.email).join(", ");

//     console.log("All User Emails:");
//     console.log(emails);

//     process.exit(0);
//   } catch (err) {
//     console.error("Error fetching emails:", err);
//     process.exit(1);
//   }
// })();

// scripts/getUserEmails.js
const mongoose = require("mongoose");
const fs = require("fs");
const User = require("./models/Users"); // adjust path to your User model

// 🔹 Replace with your Atlas production connection string
const MONGO_URI = "mongodb+srv://mackelvinn:3WP3kR8uvRdJlPSZ@cluster0.ptzjg3q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = await User.find({}, "email"); // only fetch email field
    const emails = users.map(u => u.email);

    // Create CSV content (one email per line)
    const csvContent = "email\n" + emails.join("\n");

    // Save to file
    fs.writeFileSync("user_emails.csv", csvContent);

    console.log(`✅ Exported ${emails.length} emails to user_emails.csv`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error fetching emails:", err);
    process.exit(1);
  }
})();



