const express = require("express");
const router = express.Router();
const logistics = require("../controllers/logisticsController");
const auth = require('../middleware/authMiddleware')
const expressRaw = require("express").raw;

const {validateCustomerAddress, validateVendorAddress, getCategories, getCouriers, createShipment, fetchGeneralRates, fetchSelectedCourierRates, getUserAddress}= require("../controllers/logisticsController");




router.post("/validate-customer-address", validateCustomerAddress);
router.post("/validate-vendor-address", validateVendorAddress);

router.get("/categories", getCategories);
router.get("/couriers", getCouriers);
router.post("/general-rate", fetchGeneralRates);
router.post("/selected-courier-rate/:service_codes", fetchSelectedCourierRates);

router.post("/create-shipment", createShipment);

router.post("/vendor-address", getUserAddress)

// shipbubble webhook - must be raw body
router.post("/webhook", expressRaw({ type: "application/json" }), logistics.shipbubbleWebhook);


module.exports = router;