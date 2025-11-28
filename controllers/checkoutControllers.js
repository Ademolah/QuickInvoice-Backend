const asyncHandler = require("express-async-handler");
const { createSubaccount, createSplit, initializeTransaction } = require("../utils/paystack");
const User = require("../models/Users"); 
const Order = require("../models/Order");
const slugify = require("slugify");



exports.initiateCheckout = asyncHandler(async (req, res) => {
  const {
    userId,
    items = [],
    buyerName,
    buyerEmail,
    buyerPhone,
    buyerAddress,
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
        { subaccount: vendor.paystackSubaccountCode, share: 90 },
        { subaccount: platformSub, share: 10 },
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
    buyerAddress,
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