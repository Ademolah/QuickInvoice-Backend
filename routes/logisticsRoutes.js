const express = require("express");
const router = express.Router();
const logistics = require("../controllers/logisticsController");
const auth = require('../middleware/authMiddleware')
const expressRaw = require("express").raw;



// validate address (open to public but can accept authenticated vendor saves)
router.post("/validate-address", logistics.validateAddress);
// categories & couriers (public)
router.get("/categories", logistics.getCategories);
router.get("/couriers", logistics.getCouriers);
// fetch rates (frontend will call with sender_address_code & reciever_address_code)
router.post("/fetch-rates", logistics.fetchRates);
// create shipment/label (call from frontend after user selects courier and you have request_token)
router.post("/create-shipment", logistics.createShipment);
// shipbubble webhook - must be raw body
router.post("/webhook", expressRaw({ type: "application/json" }), logistics.shipbubbleWebhook);


module.exports = router;