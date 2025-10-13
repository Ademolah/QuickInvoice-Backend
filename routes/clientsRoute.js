const express = require("express");
const router = express.Router();
const { getClients } = require("../controllers/clientController");
const auth = require("../middleware/authMiddleware");
const trackActivity = require('../middleware/trackActivity')

router.get("/", auth,trackActivity, getClients);

module.exports = router;
