const express = require("express");
const router = express.Router();

const { getAllMarketProducts } = require("../controllers/marketProductController");



router.get("/", getAllMarketProducts);


module.exports = router;