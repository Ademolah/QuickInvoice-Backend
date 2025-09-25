
const express = require('express')
const axios = require('axios')

const router = express.Router();

/**
 * @route   GET /api/bvn/verify
 * @desc    Verify BVN using Dojah
 * @access  Private (use auth middleware if needed)
 */


router.get("/verify", async (req, res) => {
  try {
    const { bvn, first_name, last_name, dob } = req.query;

    if (!bvn) {
      return res.status(400).json({ error: "BVN is required" });
    }

    const response = await axios.get(
      `${process.env.DOJAH_BASE_URL_TEST}/api/v1/kyc/bvn`,
      {
        headers: {
          AppId: process.env.DOJAH_APP_ID,
          Authorization: process.env.DOJAH_SECRET_KEY,
        },
        params: {
          bvn,
          first_name,
          last_name,
          dob,
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error("BVN verification error:", error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data || "BVN verification failed",
    });
  }
});

module.exports = router
