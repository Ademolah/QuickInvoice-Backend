require('dotenv').config({path: '../.env'});
const connectDb = require('../db/db');
const ReferralCode = require('../models/ReferralCode');




// const generateReferralCodes = async () => {
//   try {
//     await connectDb(); // <-- Use your existing DB connection
//     function generateCode() {
//       const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
//       let code = "";
//       for (let i = 0; i < 8; i++) {
//         code += chars[Math.floor(Math.random() * chars.length)];
//       }
//       return code;
//     }
//     const codes = [];
//     for (let i = 0; i < 50; i++) {
//       codes.push({ code: generateCode() });
//     }
//     await ReferralCode.insertMany(codes);
//     console.log("50 referral codes generated successfully!");
//     process.exit();
//   } catch (error) {
//     console.error("Error:", error);
//     process.exit(1);
//   }
// };



// generateReferralCodes();

const mongoose = require("mongoose");
const MarketProduct = require("../models/MarketProduct");
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await MarketProduct.updateMany(
      { inStock: { $exists: false } },
      { $set: { inStock: true } }
    );
    console.log(`✅ Updated ${result.modifiedCount} products to inStock: true`);
    process.exit(0);
  } catch (err) {
    console.error(" Stock migration failed:", err);
    process.exit(1);
  }
})();











