const express = require("express");
const authMiddleware = require("../../middleware/authMiddleware");
const Transaction = require("../../models/Transactions");
const bcrypt = require("bcrypt");
const User = require("../../models/Users");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const verifyAnchorSignature = require('../../middleware/verifyAnchorSignature')
const sendDebitAlert = require('../../utils/sendDebitAlert')


router.post("/verifyPin", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    // Basic validation
    if (!pin) {
      return res.status(400).json({ message: "PIN is required, create PIN in 'Settings' " });
    }

    // Frontend might send a number; convert to string
    const pinString = String(pin);
    
    const userId = req.userId
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user || !user.transactionPin) {
      return res.status(404).json({ message: "Transaction PIN not set, Set PIN in 'Settings' " });
    }

    
    const isMatch = await bcrypt.compare(pinString, user.transactionPin);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect PIN" });
    }

    return res.status(200).json({ message: "OK" });
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return res.status(500).json({ message: "Server error" });
  }
});


// GET /api/banks
router.get("/banks", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.sandbox.getanchor.co/api/v1/banks",
      {
        headers: {
          accept: "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY,
        },
      }
    );
    // Return the response from Anchor to the frontend
    res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "Error fetching banks from Anchor:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to fetch banks",
      error: error.response?.data || error.message,
    });
  }
});

//verify account

router.get("/verify-account/:bankCode/:accountNumber", authMiddleware, async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.params;
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        message: "bankCode and accountNumber are required",
      });
    }
    const url = `https://api.sandbox.getanchor.co/api/v1/payments/verify-account/${bankCode}/${accountNumber}`;
    const apiResponse = await axios.get(url, {
      headers: {
        accept: "application/json",
        "x-anchor-key": process.env.ANCHOR_API_KEY,
      },
    });
    // ✅ Return only relevant info to frontend
    return res.status(200).json({
      success: true,
      accountName: apiResponse.data?.data?.attributes?.accountName,
      bank: apiResponse.data?.data?.attributes?.bank?.name,
      accountNumber: apiResponse.data?.data?.attributes?.accountNumber,
    });
  } catch (error) {
    console.error(
      "Verify Account Error:",
      error?.response?.data || error.message
    );
    return res.status(500).json({
      message: "Error verifying account",
      error: error?.response?.data || error.message,
    });
  }
});


router.post("/create-counterparty", authMiddleware, async (req, res) => {
  try {
    const { bankCode, accountName, accountNumber } = req.body;
    const response = await axios.post(
      "https://api.sandbox.getanchor.co/api/v1/counterparties",
      {
        data: {
          type: "CounterParty",
          attributes: {
            bankCode,
            accountName,
            accountNumber,
            verifyName: true
          }
        }
      },
      {
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY
        }
      }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error);
    return res.status(500).json({
      message: "Failed to create counterparty",
      error: error?.response?.data || error.message
    });
  }
});

router.post("/initiate-transfer", authMiddleware, async (req, res) => {
  try {
    const {
      amount,
      currency,
      reason,
      counterPartyId, // from previous creation
      accountType = "DepositAccount",
    } = req.body;


    if(!counterPartyId){
      return res.status(400).json({ message: "counterPartyId is required" });
    }

    const reference = crypto.randomBytes(10).toString("hex");

    const userId = req.userId

    const user = await User.findById(userId)

    const accountId = user?.anchor?.account?.id
    if(!accountId){
      return res.status(400).json({ message: "User does not have a valid DepositAccount" });
    }

    const response = await axios.post(
      "https://api.sandbox.getanchor.co/api/v1/transfers",
      {
        data: {
          type: "NIPTransfer",
          attributes: {
            amount,
            currency,
            reason,
            reference
          },
          relationships: {
            account: {
              data: {
                id: accountId,
                type: accountType
              }
            },
            counterParty: {
              data: {
                id: counterPartyId,
                type: "CounterParty"
              }
            }
          }
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY
        }
      }
    );
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(error?.response?.data || error);
    return res.status(500).json({
      message: "Failed to initiate transfer",
      error: error?.response?.data || error.message
    });
  }
});

router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    // ✅ Get page & limit from query (defaults: page=1, limit=7)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 7;
    const skip = (page - 1) * limit;

    // ✅ Count total documents for this user

    const total = await Transaction.countDocuments({ user: userId });
    // ✅ Fetch paginated results
    const transactions = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .select({
        transactionType: 1,
        transactionAmount: 1,
        transactionDescription: 1,
        transactionDetail: 1,
        accountBalance: 1,
        transactionStatus: 1,
        transactionReference: 1,
        createdAt: 1,
      })
      .skip(skip)
      .limit(limit);
    return res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return res.status(500).json({
      success: false,
      message: "Could not fetch transaction history",
    });
  }
});



router.post("/webhook/anchor-transfer", verifyAnchorSignature, async (req, res) => {
  try {
    console.log(
      " FULL WEBHOOK BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const eventType = req.body?.data?.type;
    console.log("✅  Extracted Event Type:", eventType);
    if (eventType === "nip.transfer.successful") {
      const { data, included } = req.body;
      const { attributes, relationships } = data || {};
      const sessionId = attributes?.sessionId;
      // :white_check_mark: Extract from included
      const transferInfo = included?.find(
        (item) => item.type === "NIP_TRANSFER"
      );
      const counterPartyInfo = included?.find(
        (item) => item.type === "CounterParty"
      );
      const accountInfo = included?.find(
        (item) => item.type === "DepositAccount"
      );
      if (!transferInfo || !counterPartyInfo || !accountInfo) {
        console.error(":x: Missing included details in webhook payload");
        return res.status(400).json({
          message: "Missing included details in webhook payload",
        });
      }
      // ✅  Unpack attributes
      const {
        reference,
        amount,
        reason: description,
        currency,
        status,
        createdAt,
      } = transferInfo.attributes;
      const relData = accountInfo?.relationships?.customer?.data;
      const accountId = accountInfo?.id || null;
      const availableBalance =
        accountInfo?.attributes?.availableBalance || 0;
      const sourceAccountName =
        counterPartyInfo?.attributes?.accountName || null;
      const sourceAccountNumber =
        counterPartyInfo?.attributes?.accountNumber || null;
      const sourceBank = counterPartyInfo?.attributes?.bank || null;
      console.log("✅  Parsed Transfer Data:", {
        reference,
        amount,
        description,
        currency,
        sessionId,
        accountId,
        sourceAccountName,
        sourceAccountNumber,
        sourceBank,
        status,
        availableBalance,
      });
      // ✅  Find user by Anchor accountId
      const user = await User.findOne({
        "anchor.account.id": accountId,
      });
      if (!user) {
        console.error(" User not found for accountId:", accountId);
        return res.status(404).json({ message: "User not found" });
      }
      // ✅  Create Transaction Document
      await Transaction.create({
        user: user._id,
        transactionType: "OUTBOUND_TRANSFER",
        transactionDetail: {
          name: sourceAccountName || null,
          bank: sourceBank?.name || null,
          accountNumber: sourceAccountNumber || null,
        },
        transactionAmount: amount || 0,
        transactionDescription: description || null,
        sessionId: sessionId || null,
        accountId: accountId,
        currency: currency || "NGN",
        transactionReference:
          reference || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        transactionStatus:
          status === "COMPLETED" ? "COMPLETED" : "PENDING",
        accountBalance: availableBalance,
      });

      console.log("✅ Transaction Document Created Successfully");
      try {
        sendDebitAlert(amount, sourceBank?.name, user.email, sourceAccountName, user.name, sourceAccountNumber, new Date().toLocaleString(), reference, description )
      } catch (error) {
        error("❌ Failed to send debit alert email:", error.message);
      }

      return res.status(200).json({ message: "Transaction stored" });
    }
    if (eventType === "nip.transfer.failed") {
      const failureReason = req.body?.data?.attributes?.failureReason;
      console.log("Transfer Failed - Reason:", failureReason);
      return res.status(200).json({
        message: "Transfer failed",
        reason: failureReason,
      });
    }
    console.log(" Unhandled Webhook Event Type:", eventType);
    return res.status(200).json({ message: "Event ignored" });
  } catch (error) {
    console.error(":x: Webhook Error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});







module.exports = router;