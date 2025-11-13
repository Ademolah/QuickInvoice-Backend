const express = require("express")
const router = express.Router()
const {initiateCheckout} = require("../controllers/checkoutControllers")



router.post("/initiate", initiateCheckout)

module.exports = router;