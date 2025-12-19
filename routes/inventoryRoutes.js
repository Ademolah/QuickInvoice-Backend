const express = require('express');
const Product = require('../models/Products');
const auth = require('../middleware/authMiddleware');
const trackActivity = require('../middleware/trackActivity')
const User = require('../models/Users')

const router = express.Router();

/**
 * Create product
 * POST /api/inventory
 */
router.post("/", auth, trackActivity, async (req, res) => {
  try {
    const { name, price, stock, sku, category, description, active } = req.body;
    if (!name || price == null || stock == null) {
      return res.status(400).json({ message: "Name, price and stock are required" });
    }
    // Fetch user
    const user = await User.findById(req.userId).select("plan");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.plan === "free") {
      const itemCount = await Product.countDocuments({ userId: req.userId });
      if (itemCount >= 80) {
        return res.status(403).json({
          message:
            "You’ve reached the free inventory limit (80 items). Please upgrade to Pro to add unlimited products.",
          code: "UPGRADE_REQUIRED",
        });
      }
    }
    //  Create product
    const payload = {
      userId: req.userId,
      name: String(name).trim(),
      price: Number(price),
      category: category ? String(category).trim() : "General",
      stock: Math.max(0, parseInt(stock, 10)),
      sku: sku ? String(sku).trim() : undefined,
      description,
      active: active !== undefined ? !!active : true,
    };
    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "A product with this name already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * List products (current user)
 * GET /api/inventory?search=&active=
 */
router.get('/', auth,trackActivity, async (req, res) => {
  try {
    const { search = '', active } = req.query;
    const q = { userId: req.userId };
    if (search) q.name = { $regex: search, $options: 'i' };
    if (active === 'true') q.active = true;
    if (active === 'false') q.active = false;

    const products = await Product.find(q).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Get single product
 * GET /api/inventory/:id
 */
router.get('/:id', auth,trackActivity, async (req, res) => {
  try {
    const prod = await Product.findOne({ _id: req.params.id, userId: req.userId });
    if (!prod) return res.status(404).json({ message: 'Not found' });
    res.json(prod);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Update product
 * PUT /api/inventory/:id
 */
router.put('/:id', auth,trackActivity, async (req, res) => {
  try {
    const { name, price, stock,category, sku, description, active } = req.body;

    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (price !== undefined) update.price = Number(price);
    if (stock !== undefined) update.stock = Math.max(0, parseInt(stock, 10));
    if(category !== undefined) update.category = String(category).trim();
    if (sku !== undefined) update.sku = sku ? String(sku).trim() : '';
    if (description !== undefined) update.description = description;
    if (active !== undefined) update.active = !!active;

    const prod = await Product.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      update,
      { new: true, runValidators: true }
    );

    if (!prod) return res.status(404).json({ message: 'Not found' });
    res.json(prod);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A product with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Delete product
 * DELETE /api/inventory/:id
 */
router.delete('/:id', auth,trackActivity, async (req, res) => {
  try {
    const prod = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!prod) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get("/export/all", auth, async (req, res) => {
  try {
    const items = await Product.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("name sku price stock category description active createdAt");
    res.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err) {
    console.error("Inventory export error:", err);
    res.status(500).json({ message: "Failed to export inventory" });
  }
});
// KEEP THIS LAST
router.get("/:id", auth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: "Invalid product id" });
  }
  const product = await Product.findOne({
    _id: req.params.id,
    userId: req.userId,
  });
  res.json(product);
});

module.exports = router;
