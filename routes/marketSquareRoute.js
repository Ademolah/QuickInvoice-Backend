
const express = require("express");
const { setupMarketSquare, addProduct, getMyProducts, getPublicProducts } = require("../controllers/marketSquareController");
const { auth } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");


const router = express.Router();
// Protected Routes



router.post("/setup", auth, setupMarketSquare);
router.post("/product", auth, upload.single("image"), addProduct);
router.get("/my-products", auth, getMyProducts);
// Public Route
router.get("/:slug", getPublicProducts);


module.exports = router;