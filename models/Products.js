const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },               // optional
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 }, // inventory count
    category: {type: String, required: false, enum:["Phones","Laptops","Gadgets", "Fashion", "Medicine","Furniture", "Restaurant","Stationery"]},
    // quantity: {type: Number, required: true},
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate product names per user (you can also use sku)
productSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
