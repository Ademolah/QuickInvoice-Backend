
const MarketSquareSetup = require("../models/MarketSquareSetup");
const MarketProduct = require("../models/MarketProduct");
const User = require("../models/Users");
const slugify = require("slugify");

//  Create or Update MarketSquare Setup
export const setupMarketSquare = async (req, res) => {
  try {
    const userId = req.userId;
    const { whatsapp, termsAccepted } = req.body;
    if (!whatsapp || !termsAccepted) {
      return res.status(400).json({ message: "Please provide WhatsApp and accept terms." });
    }
    // Fetch user's business name from User model
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const slug = slugify(user.businessName || user.name, { lower: true });
    let setup = await MarketSquareSetup.findOne({ userId });
    if (setup) {
      setup.whatsapp = whatsapp;
      setup.termsAccepted = termsAccepted;
      await setup.save();
    } else {
      setup = await MarketSquareSetup.create({ userId, whatsapp, termsAccepted, slug });
    }
    res.status(200).json({ message: "MarketSquare setup complete", setup });
  } catch (error) {
    console.error("Setup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// :jigsaw: Add Product
export const addProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, price, description } = req.body;
    const image = req.file?.path; // Cloudinary URL
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required." });
    }
    const product = await MarketProduct.create({
      userId,
      name,
      price,
      description,
      image,
    });
    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// :jigsaw: Get User Products (for dashboard)
export const getMyProducts = async (req, res) => {
  try {
    const userId = req.userId;
    const products = await MarketProduct.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("Get My Products Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// :jigsaw: Public Route - Get Products by Slug (for Market.jsx)
export const getPublicProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1 } = req.query;
    const limit = 8;
    const skip = (page - 1) * limit;
    const setup = await MarketSquareSetup.findOne({ slug }).populate("userId");
    if (!setup) return res.status(404).json({ message: "Business not found" });
    const products = await MarketProduct.find({ userId: setup.userId._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await MarketProduct.countDocuments({ userId: setup.userId._id });
    res.status(200).json({
      business: setup.userId.businessName || setup.userId.name,
      whatsapp: setup.whatsapp,
      products,
      pagination: {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Public Products Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};








