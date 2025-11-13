// const axios = require('axios');

// const paystack = axios.create({
//   baseURL: 'https://api.paystack.co',
//   headers: {
//     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//     'Content-Type': 'application/json'
//   },
//   timeout: 20000,
// });

// module.exports = paystack;


const axios = require("axios");
const PAYSTACK_BASE = "https://api.paystack.co";
const client = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

/**
 * Create a Paystack subaccount for a vendor (bank account receiver).
 * @param {Object} data - { business_name, account_number, bank_code, percentage_charge }
 * @returns {Promise<Object>} Paystack response data
 */
async function createSubaccount(data) {
  // Paystack expects: business_name, settlement_bank, account_number, primary_contact, primary_contact_email, percentage_charge (optional)
  const payload = {
    business_name: data.business_name,
    settlement_bank: data.settlement_bank, // bank code e.g "044"
    account_number: data.account_number,
    primary_contact_name: data.primary_contact_name || "",
    primary_contact_email: data.primary_contact_email || "",
    percentage_charge: data.percentage_charge || 0,
  };
  const res = await client.post("/subaccount", payload);
  return res.data; // { status, message, data: { subaccount_code, ... } }
}
/**
 * Create a split
 * docs: https://paystack.com/docs/api/split
 * @param {Object} payload - Paystack create split payload
 */

async function createSplit(payload) {
  const res = await client.post("/split", payload);
  return res.data;
}

/**
 * Initialize transaction with split_code
 * @param {Object} payload - { email, amount, callback_url, split_code, metadata }
 */

async function initializeTransaction(payload) {
  const res = await client.post("/transaction/initialize", payload);
  return res.data;
}

/**
 * Verify transaction by reference
 */
async function verifyTransaction(reference) {
  const res = await client.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  return res.data;
}


module.exports = {
  client,
  createSubaccount,
  createSplit,
  initializeTransaction,
  verifyTransaction,
};