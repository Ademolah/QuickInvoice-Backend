

const express = require("express");
const axios = require("axios");
const User = require('../../models/Users')
const authMiddleware = require('../../middleware/authMiddleware')
const {createVirtualAccount} = require('../services/anchorService')


const verifyAnchorSignature = require('../../middleware/verifyAnchorSignature')

const router = express.Router();
// Create Customer in Anchor
router.post("/create-customer", authMiddleware, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      addressLine_1,
      city,
      state,
      postalCode,
      country,
      email,
      phoneNumber,
      dateOfBirth,
      gender,
      bvn
    } = req.body;
    // Build Anchor payload
    const anchorPayload = {
      data: {
        type: "IndividualCustomer",
        attributes: {
          fullName: {
            firstName,
            lastName,
          },
          address: {
            addressLine_1,
            city,
            state,
            postalCode,
            country,
          },
          email,
          phoneNumber,
          identificationLevel2: {
            dateOfBirth,
            gender,
            bvn,
          },
          metadata: {
            my_customerID: `cust_${Date.now()}`, // unique reference
          },
        },
      },
    };
    // Send to Anchor API
    const response = await axios.post(
      "https://api.sandbox.getanchor.co/api/v1/customers",
      anchorPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY,
        },
      }
    );


    

    // Extract Anchor Customer ID
    const anchorId = response.data?.data?.id;

    //save anchor details to user
    const userId = req.userId;
    await User.findByIdAndUpdate(userId, {
        $set: {
            "anchor.customerId": anchorId,
            "anchor.fullResponse": response.data,  
            "anchor.createdAt": new Date()   
        }
    })

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      anchorCustomerId: anchorId,
      fullResponse: response.data, // optional
    });
  } catch (error) {
    console.error("Anchor Customer Creation Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create customer",
      error: error.response?.data || error.message,
    });
  }
});


// POST /api/anchor/verify-customer/:id
router.post("/verify-customer/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // userId from params
    const user = await User.findById(userId);

    if (!user || !user.anchor?.fullResponse) {
      return res.status(404).json({ success: false, message: "User or Anchor details not found" });
    }
    // Extract saved Anchor details
    const anchorData = user.anchor.fullResponse.data.attributes;
    const payload = {
      data: {
        type: "Verification",
        attributes: {
          level: "TIER_2",
          level2: {
            bvn: anchorData?.identificationLevel2?.bvn,
            dateOfBirth: anchorData?.identificationLevel2?.dateOfBirth,
            gender: anchorData?.identificationLevel2?.gender,
          }
        }
      }
    };
    const response = await axios.post(
      `https://api.sandbox.getanchor.co/api/v1/customers/${user.anchor.customerId}/verification/individual`,
      payload,
      {
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY,
        },
      }
    );
    return res.status(200).json({
      success: true,
      message: "Verification initiated, wait for webhook event",
      data: response.data,
    });
  } catch (error) {
    console.error("Anchor Verification Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Verification request failed",
      error: error.response?.data || error.message,
    });
  }
});


// // Create Virtual Account
// router.post("/create-account/:userId", authMiddleware, async (req, res) => {
//   try {
//     // const user = await User.findById(req.params.userId);

//     const user = req.userId
//     if (!user || !user.anchor || !user.anchor.verified) {
//       return res.status(400).json({ message: "User not verified or not found" });
//     }
//     const response = await axios.post(
//       "https://api.sandbox.getanchor.co/api/v1/accounts",
//       {
//         data: {
//           type: "DepositAccount",
//           attributes: { productName: "SAVINGS" },
//           relationships: {
//             customer: {
//               data: {
//                 id: user.anchor.customerId, // from DB
//                 type: "IndividualCustomer",
//               },
//             },
//           },
//         },
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "x-anchor-key": process.env.ANCHOR_API_KEY,
//         },
//       }
//     );
//     // Save account details to DB
//     user.anchor.account = response.data.data;
//     await user.save();
//     res.json({
//       message: "Virtual account created successfully",
//       account: response.data.data,
//     });
//   } catch (err) {
//     console.error(err.response?.data || err.message);
//     res.status(500).json({ message: "Error creating virtual account" });
//   }
// });



//Manual
router.post("/manual-create-account/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    const user = await User.findById(userId);
    if (!user || !user.anchor?.verified || !user.anchor?.customerId) {
      return res.status(400).json({
        message: "User not verified or Anchor customerId missing",
      });
    }
    const account = await createVirtualAccount(user); // The same function from webhook
    return res.json({ success: true, account });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Failed to create account" });
  }
});



// Create Virtual Account (existing endpoint)
router.post("/create-account/:userId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId); // middleware sets this
    const account = await createVirtualAccount(user);
    res.json({
      message: "Virtual account created successfully",
      account,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: err.message || "Error creating virtual account" });
  }
});


router.get("/account/details", authMiddleware, async (req, res) => {
  try {
    // Get the current user
    const user = await User.findById(req.userId);
    if (
      !user ||
      !user.anchor ||
      !user.anchor.account ||
      !user.anchor.account.id
    ) {
      return res.status(404).json({
        success: false,
        message: "No account found for this user",
      });
    }
    const accountId = user.anchor.account.id; // e.g. "169925847367121-anc_acc"
    const response = await axios.get(
      `https://api.sandbox.getanchor.co/api/v1/accounts/${accountId}?include=AccountNumber`,
      {
        headers: {
          accept: "application/json",
          "x-anchor-key": process.env.ANCHOR_API_KEY,
        },
      }
    );
    // Return full Anchor data to frontend
    return res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Error fetching virtual account details:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch virtual account details",
    });
  }
});


//webhook for verification
router.post("/webhook", verifyAnchorSignature, async (req, res) => {
  try {
    const event = req.body;
    if (!event?.data) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload" });
    }
    const eventType = event.data.type;
    if (eventType === "customer.identification.approved") {
      // ✅ Customer verification successful
      
      console.log("✅ Verification successful:", event);

      const customerId = event.data.relationships?.customer?.data?.id;
      
      const user = await User.findOneAndUpdate(
          { "anchor.customerId": customerId },
          { $set: { "anchor.verified": true } },
          { new: true }
        );

      if(user){
        try {
          await createVirtualAccount(user)
          console.log('Virtual account created after verification');
        } catch (error) {
          console.error('Failed to create virtual account ');
        }
      }



      // Example: update user if you included metadata.my_customerID in creation
      // const customerId = event.data.relationships?.customer?.data?.id;
      // await User.findOneAndUpdate(
      //   { "anchor.customerId": customerId },
      //   { $set: { "anchor.verified": true } }


      // );
      return res.status(200).json({ success: true, message: "Verification success processed" });
    }


    // // ❌ Any other event
    // console.warn("❌ Verification failed or error:", event);
    // return res.status(400).json({
    //   success: false,
    //   message: "Verification failed",
    //   event,
    // });
  } catch (err) {
    console.error("Webhook handler error:", err.message);
    return res.status(500).json({ success: false, message: "Server error in webhook" });
  }
});


router.get("/check-customer", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (user?.anchor?.customerId) {
      return res.json({ anchorCustomerExists: true });
    }
    return res.json({ anchorCustomerExists: false });
  } catch (error) {
    console.error("Error checking anchor status:", error);
    return res.status(500).json({ message: "Server error" });
  }
});




module.exports = router;