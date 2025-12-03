
const MarketSquareSetup = require("../models/MarketSquareSetup");
const MarketProduct = require("../models/MarketProduct");
const User = require("../models/Users");
const slugify = require("slugify");
const cloudinary = require("../utils/cloudinary");
const ReferralCode = require("../models/ReferralCode");

//  Create or Update MarketSquare Setup

const setupMarketSquare = async (req, res) => {
  try {
    const userId = req.userId;
    const { whatsapp, termsAccepted, referralCode } = req.body;
    if (!whatsapp || !termsAccepted || !referralCode) {
      return res.status(400).json({
        message: "Please provide WhatsApp, referral code, and accept terms.",
      });
    }
    // Validate referral code
    const validCode = await ReferralCode.findOne({ code: referralCode });
    if (!validCode) {
      return res.status(400).json({ message: "Invalid or already used referral code." });
    }
    // Get user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    // Assign referral code to user
    user.referralCode = referralCode;
    await user.save();
    // Delete referral code so it can’t be reused
    await ReferralCode.deleteOne({ code: referralCode });
    // Generate slug
    const slug = slugify(user.businessName || user.name, { lower: true });
    // Check if setup exists
    let setup = await MarketSquareSetup.findOne({ userId });
    if (setup) {
      setup.whatsapp = whatsapp;
      setup.termsAccepted = termsAccepted;
      setup.slug = slug;
      await setup.save();
    } else {
      setup = await MarketSquareSetup.create({
        userId,
        whatsapp,
        termsAccepted,
        slug,
      });
    }
    user.slug = slug;
    await user.save();
    const updatedUser = await User.findById(userId).select("slug businessName referralCode");
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
const addProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, price, description, category, shipping_category, shipping_category_id } = req.body;
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
      shipping_category,
      shipping_category_id,
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

// const addProduct = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const { name, price, description, category} = req.body;
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

const editProduct = async (req, res) => {
  try {
    const userId = req.userId;
    const productId = req.params.id;
    const { name, price, description, category, shipping_category, shipping_category_id } = req.body;
    // Validate
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required." });
    }
    // Find existing product
    const product = await MarketProduct.findOne({ _id: productId, userId });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    let imageUrl = product.image;
    let imagePublicId = product.imagePublicId;
    // If user uploaded a replacement image
    if (req.file && req.file.buffer) {
      // Delete old image if exists
      if (imagePublicId) {
        await cloudinary.uploader.destroy(imagePublicId);
      }
      // Upload new one
      const uploadStream = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "quickinvoice_ng/products",
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto" },
              ],
              format: "png",
            },
            (err, result) => {
              if (err) reject(err);
              resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });
      const result = await uploadStream();
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }
    // Update database
    const updatedProduct = await MarketProduct.findByIdAndUpdate(
      productId,
      {
        name,
        price,
        description,
        category,
        shipping_category,
        shipping_category_id,
        image: imageUrl,
        imagePublicId,
      },
      { new: true }
    );
    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Edit Product Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {setupMarketSquare, getPublicProducts, addProduct, getMyProducts, getMarketSquareSetup, deleteProduct, editProduct};








