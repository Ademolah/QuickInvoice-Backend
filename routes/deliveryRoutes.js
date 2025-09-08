const express = require("express");
const router = express.Router();
const {
  createDelivery,
  getDeliveries,
  updateDeliveryStatus,
} = require("../controllers/deliveryController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/", authMiddleware, createDelivery);
router.get("/", authMiddleware, getDeliveries);
router.put("/:id/status", authMiddleware, updateDeliveryStatus);

module.exports = router;
