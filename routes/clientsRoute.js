const express = require("express");
const router = express.Router();
const { getClients } = require("../controllers/clientController");
const auth = require("../middleware/authMiddleware");

router.get("/", auth, getClients);

module.exports = router;
