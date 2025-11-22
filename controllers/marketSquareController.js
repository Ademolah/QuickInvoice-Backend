
const MarketSquareSetup = require("../models/MarketSquareSetup");
const MarketProduct = require("../models/MarketProduct");
const User = require("../models/Users");
const slugify = require("slugify");
const cloudinary = require("../utils/cloudinary"); // adjust path if neede

//  Create or Update MarketSquare Setup

const setupMarketSquare = async (req, res) => {
  try {
    const userId = req.userId;
    const { whatsapp, termsAccepted } = req.body;
    if (!whatsapp || !termsAccepted) {
      return res.status(400).json({
        message: "Please provide WhatsApp and accept terms.",
      });
    }
    //  Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    // Generate slug
    const slug = slugify(user.businessName || user.name, { lower: true });
    // : Check if setup exists
    let setup = await MarketSquareSetup.findOne({ userId });
    if (setup) {
      setup.whatsapp = whatsapp;
      setup.termsAccepted = termsAccepted;
      setup.slug = slug;
      await setup.save();
    } else {
      setup = await MarketSquareSetup.create({
        userId, // :white_check_mark: matches schema
        whatsapp,
        termsAccepted,
        slug,
      });
    }
    // :white_check_mark: Update user's slug
    user.slug = slug;
    await user.save();

    const updatedUser = await User.findById(userId).select("slug businessName");

    res.status(200).json({
      message: "MarketSquare setup complete",
      setup,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Setup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


//  Add Product
// const addProduct = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const { name, price, description, category, shipping_category, shipping_category_id } = req.body;
//     if (!name || !price) {
//       return res.status(400).json({ message: "Name and price are required." });
//     }
//     let imageUrl = null;
//     let imagePublicId = null;
//     // :white_check_mark: Upload to Cloudinary using buffer stream (like avatar)
//     if (req.file && req.file.buffer) {
//       const bufferStreamUpload = (buffer) =>
//         new Promise((resolve, reject) => {
//           const stream = cloudinary.uploader.upload_stream(
//             {
//               folder: `quickinvoice_ng/products`,
//               transformation: [
//                 { width: 1200, height: 1200, crop: "limit" },
//                 { quality: "auto" },
//               ],
//               format: "png",
//             },
//             (error, result) => {
//               if (error) return reject(error);
//               resolve(result);
//             }
//           );
//           stream.end(buffer);
//         });
//       const result = await bufferStreamUpload(req.file.buffer);
//       imageUrl = result.secure_url;
//       imagePublicId = result.public_id;
//     }
//     //  Save product to DB
//     const product = await MarketProduct.create({
//       userId,
//       name,
//       price,
//       category,
//       shipping_category,
//       shipping_category_id,
//       description,
//       image: imageUrl,
//       imagePublicId,
//     });
//     res.status(201).json({
//       message: "Product added successfully",
//       product,
//     });
//   } catch (error) {
//     console.error("Add Product Error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const addProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, price, description, category} = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required." });
    }
    let imageUrl = null;
    let imagePublicId = null;
    // :white_check_mark: Upload to Cloudinary using buffer stream (like avatar)
    if (req.file && req.file.buffer) {
      const bufferStreamUpload = (buffer) =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: `quickinvoice_ng/products`,
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto" },
              ],
              format: "png",
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          stream.end(buffer);
        });
      const result = await bufferStreamUpload(req.file.buffer);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }
    //  Save product to DB
    const product = await MarketProduct.create({
      userId,
      name,
      price,
      category,
      description,
      image: imageUrl,
      imagePublicId,
    });
    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("Add Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//  Get User Products (for dashboard)
const getMyProducts = async (req, res) => {
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
const getPublicProducts = async (req, res) => {
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

const deleteProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const product = await MarketProduct.findOne({ _id: id, userId });
    if (!product) {
      return res.status(404).json({ message: "Product not found or unauthorized" });
    }

    //delete product image from cloudinary
     if (product.image) {
      try {
        const imageUrl = product.image;
        const matches = imageUrl.match(/upload\/(?:v\d+\/)?([^\.]+)/);
        if (matches && matches[1]) {
          const publicId = matches[1]; // 
          const result = await cloudinary.uploader.destroy(publicId);
          console.log("🗑️ Cloudinary deletion result:", result);
        } else {
          console.warn(" Could not extract public_id from image URL:", imageUrl);
        }
      } catch (err) {
        console.error("Cloudinary deletion failed:", err.message);
      }
    }

    await product.deleteOne();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getMarketSquareSetup = async (req, res) => {
  try {

    const userId = req.userId;
    console.log("User Id", userId)
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user ID found." });
    }

    
    const setup = await MarketSquareSetup.findOne({ user: userId });
    if (!setup) {
      return res.status(404).json({ message: "No MarketSquare setup found." });
    }
    res.status(200).json(setup);
  } catch (error) {
    console.error("Error fetching MarketSquare setup:", error);
    res.status(500).json({ message: "Server error while fetching setup." });
  }
};


module.exports = {setupMarketSquare, getPublicProducts, addProduct, getMyProducts, getMarketSquareSetup, deleteProduct};








