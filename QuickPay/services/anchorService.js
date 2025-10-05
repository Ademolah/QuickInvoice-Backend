const axios = require("axios");
const User = require("../../models/Users");



async function createVirtualAccount(user) {
  if (!user || !user.anchor || !user.anchor.verified) {
    throw new Error("User not verified or not found");
  }
  const response = await axios.post(
    `${process.env.ANCHOR_BASEURL}/api/v1/accounts`,
    {
      data: {
        type: "DepositAccount",
        attributes: { productName: "SAVINGS" },
        relationships: {
          customer: {
            data: {
              id: user.anchor.customerId,
              type: "IndividualCustomer",
            },
          },
        },
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        "x-anchor-key": process.env.ANCHOR_API_KEY,
      },
    }
  );
  // Save returned account info to DB
  user.anchor.account = response.data.data;
  await user.save();
  return response.data.data;
}
module.exports = { createVirtualAccount };