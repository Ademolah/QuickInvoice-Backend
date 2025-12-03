
const express = require("express")
const { setupMarketSquare, addProduct, getMyProducts, getPublicProducts, getMarketSquareSetup, deleteProduct, editProduct } = require("../controllers/marketSquareController");
const  auth  = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const User = require("../models/Users");
const MarketProduct = require("../models/MarketProduct");
const MarketSquareSetup = require("../models/MarketSquareSetup");


const router = express.Router();
// Protected Routes

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};


router.post("/setup", auth, setupMarketSquare);
router.post("/setup", auth, getMarketSquareSetup);
router.post("/product", auth, upload.single("image"), addProduct);
router.get("/my-products", auth, getMyProducts);
// Public Route
router.get("/:slug", getPublicProducts);
router.delete("/product/:id", auth, deleteProduct);

router.get('/store/:slug', asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const user = await User.findOne({ slug });
  if (!user) return res.status(404).json({ message: 'Store not found' });
  const products = await MarketProduct.find({ userId: user._id });
  const setup = await MarketSquareSetup.findOne({ userId: user._id });
  
  res.json({
    store: {
      name: user.businessName || user.name,
      whatsappNumber: setup?.whatsapp || null,
      slug: user.slug,
      avatar: user.avatar,
    },
    products,
  });
}));

router.patch('/product/:id', auth, upload.single('image'), editProduct)


module.exports = router;