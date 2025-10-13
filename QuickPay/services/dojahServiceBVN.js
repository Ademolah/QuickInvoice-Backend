const axios = require('axios')


async function verifyBVN(bvn, first_name, last_name, dob) {
  try {
    if (!bvn) {
      throw { status: 400, message: "BVN is required" };
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

    return { status: 200, data: response.data };
    
  } catch (error) {
    console.error("BVN verification error:", error.response?.data || error.message);
    return {
      status: error.response?.status || 500,
      data: error.response?.data || { error: "BVN verification failed" },
    };
  }
}


module.exports = { verifyBVN };