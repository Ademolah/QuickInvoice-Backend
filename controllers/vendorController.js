const Order = require("../models/Order");




exports.getVendorStats = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware


    const orders = await Order.find({ userId: userId });
    const totalOrders = orders.length;
    const totalVolume = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
    return res.status(200).json({
      success: true,
      totalOrders,
      totalVolume
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};







