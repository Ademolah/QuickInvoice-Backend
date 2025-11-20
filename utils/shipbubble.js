const axios = require("axios");
const SHIPBUBBLE_BASE = "https://api.shipbubble.com";
const SHIPBUBBLE_KEY = process.env.SHIPBUBBLE_API_KEY;
if (!SHIPBUBBLE_KEY) {
  console.warn("SHIPBUBBLE_API_KEY not set!");
}
const shipbubbleClient = axios.create({
  baseURL: SHIPBUBBLE_BASE,
  headers: {
    Authorization: `Bearer ${SHIPBUBBLE_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});
module.exports = shipbubbleClient;