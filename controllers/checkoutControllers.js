const asyncHandler = require("express-async-handler");
const { createSubaccount, createSplit, initializeTransaction } = require("../utils/paystack");
const User = require("../models/Users"); 
const Order = require("../models/Order");
const slugify = require("slugify");


/**
 * POST /api/checkout/initiate
 * body: { vendorId, items: [{name, price, qty}], buyerName, buyerEmail, buyerPhone, callbackUrl (optional) }
 */
// exports.initiateCheckout = asyncHandler(async (req, res) => {
//   const {
//     userId,
//     items = [],
//     buyerName,
//     buyerEmail,
//     buyerPhone,
//     callbackUrl, // optional override
//   } = req.body;
//   if (!userId || items.length === 0 || !buyerEmail) {
//     return res.status(400).json({ message: "userId, items and buyerEmail are required" });
//   }


//   // Load vendor (user) from DB
//   const vendor = await User.findById(userId);
  
//   if (!vendor) return res.status(404).json({ message: "Vendor not found" });
//   // Ensure vendor has bank details (accountNumber, bankCode or bankName + conversion)
//   // Adjust names per your User model: user.accountNumber, user.bankCode / user.bankName
//   if (!vendor.accountDetails.accountNumber || !vendor.accountDetails.bankCode) {
//     return res.status(400).json({ message: "Vendor does not have a configured bank account (accountNumber & bankCode required)" });
//   }

//   // Compute amount (in kobo). Items price assumed in NGN. Sum = sum(price * qty)
//   const totalNaira = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
//   if (!totalNaira || totalNaira <= 0) return res.status(400).json({ message: "Invalid total amount" });
//   const totalInKobo = Math.round(totalNaira * 100);



//   // PLATFORM split percentage
//   const PLATFORM_PERCENT = 20; // percent
//   const VENDOR_PERCENT = 100 - PLATFORM_PERCENT; // 80
//   // 1) ensure vendor subaccount exists: store vendor.paystackSubaccountCode or vendor.paystackSubaccountId
//   if (!vendor.paystackSubaccountCode) {
//     // create subaccount on Paystack
//     // Paystack expects settlement_bank as bank code (like "044"), and account number
//     const saPayload = {
//       business_name: vendor.businessName || vendor.name || `vendor-${vendor._id}`,
//       settlement_bank: vendor.accountDetails.bankCode,      // must be bank code (not name)
//       account_number: vendor.accountDetails.accountNumber,
//       primary_contact_name: vendor.name || "",
//       primary_contact_email: vendor.email || "",
//       percentage_charge: 0 // optional
//     };
//     const saRes = await createSubaccount(saPayload);
//     if (!saRes || !saRes.data) throw new Error("Failed to create vendor subaccount on Paystack");
//     vendor.paystackSubaccountCode = saRes.data.subaccount_code; // save for future
//     await vendor.save();
//   }
//   // 2) ensure split exists for this vendor
//   if (!vendor.paystackSplitCode) {
//     // platform subaccount code must be in env
//     const platformSubaccount = process.env.PLATFORM_SUBACCOUNT_ID;
//     if (!platformSubaccount) {
//       return res.status(500).json({ message: "Platform subaccount is not configured (PLATFORM_SUBACCOUNT_ID)" });
//     }
//     // create split with subaccounts: vendor and platform

//     const splitPayload = {
//     name: `split_vendor_${vendor._id}`,
//     description: `Split for vendor ${vendor._id}`,
//     type: "percentage",
//     currency: "NGN",
//     subaccounts: [
//         { subaccount: vendor.paystackSubaccountCode, share: VENDOR_PERCENT },
//         { subaccount: platformSubaccount, share: PLATFORM_PERCENT },
//     ],
//     bearer_type: "subaccount", // the subaccount that bears transaction charges
//     bearer_subaccount: vendor.paystackSubaccountCode, // vendor bears charges
//     };
//     try {
//     const splitRes = await createSplit(splitPayload);
//     if (!splitRes || !splitRes.data) {
//         throw new Error("Failed to create split on Paystack");
//     }
//     // Save split code to vendor record
//     vendor.paystackSplitCode = splitRes.data.split_code;
//     await vendor.save();
//     console.log("✅ Split created successfully:", splitRes.data);
//     } catch (error) {
//     console.error("Paystack Split Error:", error.response?.data || error.message);
//     throw error;
//     }

//   }
//   // 3) create an Order record (pending)
//   const order = await Order.create({
//     userId: vendor._id,
//     buyerName,
//     buyerEmail,
//     buyerPhone,
//     items,
//     amount: totalInKobo,
//     currency: "NGN",
//     status: "pending",
//   });
//   // 4) initialize transaction
//   const paystackPayload = {
//     email: buyerEmail,
//     amount: totalInKobo,
//     callback_url: callbackUrl || `${process.env.BASE_URL}/api/checkout/paystack-callback`,
//     split_code: vendor.paystackSplitCode,
//     metadata: {
//       orderId: order._id.toString(),
//       vendorId: vendor._id.toString(),
//       buyerName,
//     },
//   };
//   const initRes = await initializeTransaction(paystackPayload);
//   if (!initRes || !initRes.data) {
//     return res.status(500).json({ message: "Failed to initialize Paystack transaction" });
//   }
//   // save reference + authorization_url to order
//   order.paystackReference = initRes.data.reference;
//   order.paystackAuthorizationUrl = initRes.data.authorization_url;
//   await order.save();
//   // return the authorization url to frontend
//   res.json({
//     success: true,
//     authorization_url: initRes.data.authorization_url,
//     reference: initRes.data.reference,
//     orderId: order._id,
//   });
// });


exports.initiateCheckout = asyncHandler(async (req, res) => {
  const {
    userId,
    items = [],
    buyerName,
    buyerEmail,
    buyerPhone,
    callbackUrl,
  } = req.body;
  if (!userId || items.length === 0 || !buyerEmail) {
    return res.status(400).json({ message: "userId, items, buyerEmail required" });
  }
  const vendor = await User.findById(userId);
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });
  if (!vendor.accountDetails.accountNumber || !vendor.accountDetails.bankCode) {
    return res.status(400).json({ message: "Vendor has no bank details configured" });
  }
    const deliveryFee = Number(req.body.deliveryFee) || 0;
    // Calculate cart total
    const cartTotal = items.reduce(
    (t, i) => t + (Number(i.price) || 0) * (Number(i.qty) || 1),
    0
    );
    // Final order total = Cart total + delivery fee
    const totalNaira = cartTotal + deliveryFee;
    if (!totalNaira || totalNaira <= 0) {
    return res.status(400).json({ message: "Invalid total amount" });
    }
    // Convert to kobo
    const totalInKobo = Math.round(totalNaira * 100);


  /**
   * ─────────────────────────────────────────────
   * 1. Ensure Vendor Subaccount Exists
   * ─────────────────────────────────────────────
   */
  if (!vendor.paystackSubaccountCode) {
    const saPayload = {
      business_name: vendor.businessName || vendor.name,
      settlement_bank: vendor.accountDetails.bankCode,
      account_number: vendor.accountDetails.accountNumber,
      primary_contact_name: vendor.name,
      primary_contact_email: vendor.email,
      percentage_charge: 0,
    };
    const saRes = await createSubaccount(saPayload);
    if (!saRes || !saRes.data) {
      throw new Error("Failed to create subaccount");
    }
    vendor.paystackSubaccountCode = saRes.data.subaccount_code;
    await vendor.save();
  }
  /**
   * ─────────────────────────────────────────────
   * 2. Ensure SPLIT exists for vendor
   * ─────────────────────────────────────────────
   */
  if (!vendor.paystackSplitCode) {
    const platformSub = process.env.PLATFORM_SUBACCOUNT_ID;
    if (!platformSub) {
      return res.status(500).json({ message: "Platform subaccount missing" });
    }
    const splitPayload = {
      name: `split_vendor_${vendor._id}`,
      type: "percentage",
      currency: "NGN",
      subaccounts: [
        { subaccount: vendor.paystackSubaccountCode, share: 95 },
        { subaccount: platformSub, share: 5 },
      ],
      bearer_type: "subaccount",
      bearer_subaccount: vendor.paystackSubaccountCode,
    };
    const splitRes = await createSplit(splitPayload);
    if (!splitRes || !splitRes.data) {
      throw new Error("Failed to create split");
    }
    vendor.paystackSplitCode = splitRes.data.split_code;
    await vendor.save();
  }
  /**
   * ─────────────────────────────────────────────
   * 3. Create Order (PENDING)
   * ─────────────────────────────────────────────
   */
  const order = await Order.create({
    userId: vendor._id,
    buyerName,
    buyerEmail,
    buyerPhone,
    items,
    amount: totalInKobo,
    currency: "NGN",
    status: "pending",
  });
  /**
   * ─────────────────────────────────────────────
   * 4. Initialize Paystack Transaction (INLINE MODAL)
   * ─────────────────────────────────────────────
   */
  const initPayload = {
    email: buyerEmail,
    amount: totalInKobo,
    split_code: vendor.paystackSplitCode,
    callback_url: `${process.env.FRONTEND_URL}/payment-success?orderId=${order._id}`,
    metadata: {
        orderId: order._id.toString(),
        vendorId: vendor._id.toString(),
        buyerName,
        type: "market_order"
    },
  };
  const initRes = await initializeTransaction(initPayload);
  if (!initRes || !initRes.data) {
    return res.status(500).json({ message: "Failed to initialize transaction" });
  }

  
  // Save the reference
  order.paystackReference = initRes.data.reference;
  await order.save();
  return res.json({
    success: true,
    access_code: initRes.data.access_code,  // For Inline
    reference: initRes.data.reference,
    orderId: order._id,
    amount: totalInKobo
  });
});