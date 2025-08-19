const express = require('express');
const Product = require('../models/Products');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * Create product
 * POST /api/inventory
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, price, stock, sku, category, description, active } = req.body;

    if (!name || price == null || stock == null) {
      return res.status(400).json({ message: 'Name, price and stock are required' });
    }

    const payload = {
      userId: req.userId,
      name: String(name).trim(),
      price: Number(price),
      category: String(category).trim() ,
      stock: Math.max(0, parseInt(stock, 10)),
      sku: sku ? String(sku).trim() : undefined,
      description,
      active: active !== undefined ? !!active : true,
    };

    const product = await Product.create(payload);
    res.status(201).json(product);
  } catch (err) {
    // Handle unique index error (duplicate name per user)
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'A product with this name already exists' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * List products (current user)
 * GET /api/inventory?search=&active=
 */
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
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
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, price, stock, sku, description, active } = req.body;

    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (price !== undefined) update.price = Number(price);
    if (stock !== undefined) update.stock = Math.max(0, parseInt(stock, 10));
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
router.delete('/:id', auth, async (req, res) => {
  try {
    const prod = await Product.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!prod) return res.status(404).json({ message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
