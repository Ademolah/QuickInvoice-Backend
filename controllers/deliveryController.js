const Delivery = require("../models/Delivery");

// Create new delivery request
const createDelivery = async (req, res) => {
  try {
    const { pickupAddress, deliveryAddress, receiverName, receiverPhone } = req.body;
    const userId = req.userId; // assuming JWT auth middleware

    const newDelivery = new Delivery({
      userId,
      pickupAddress,
      deliveryAddress,
      receiverName,
      receiverPhone,
    });

    await newDelivery.save();
    res.status(201).json(newDelivery);
  } catch (err) {
    console.error("Error creating delivery:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get current user's deliveries
const getDeliveries = async (req, res) => {
  try {
    const userId = req.userId;
    const deliveries = await Delivery.find({ userId }).sort({ createdAt: -1 });
    res.json(deliveries);
  } catch (err) {
    console.error("Error fetching deliveries:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update delivery status (admin/internal use)
const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const delivery = await Delivery.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!delivery) return res.status(404).json({ message: "Delivery not found" });
    res.json(delivery);
  } catch (err) {
    console.error("Error updating delivery:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createDelivery, getDeliveries, updateDeliveryStatus };
