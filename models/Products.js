const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },               // optional
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0 }, // inventory count
    category: {type: String, required: false, enum:[ // Electronics & Tech
  "Phones",
  "Laptops",
  "Tablets",
  "Accessories",
  "Computer Peripherals",
  "Gadgets",
  "Smart Home Devices",
  "Gaming Consoles",
  "Gaming Accessories",
  // Fashion & Lifestyle
  "Men's Clothing",
  "Women's Clothing",
  "Children's Clothing",
  "Footwear",
  "Bags & Wallets",
  "Watches",
  "Jewelry",
  "Beauty & Cosmetics",
  "Fragrances",
  // Health & Medicine
  "Medicine",
  "Medical Equipment",
  "Health Supplements",
  "Personal Care",
  // Home & Furniture
  "Furniture",
  "Home Decor",
  "Kitchen Appliances",
  "Household Items",
  "Lighting & Fixtures",
  // Food & Restaurant
  "Restaurant",
  "Fast Food",
  "Groceries",
  "Beverages",
  "Bakery Items",
  "Frozen Foods",
  // Office & Stationery
  "Stationery",
  "Office Supplies",
  "Printing & Packaging",
  "School Supplies",
  // Auto & Industrial
  "Automobile Parts",
  "Car Accessories",
  "Motorcycles & Parts",
  "Industrial Equipment",
  // Services & Digital
  "Digital Products",
  "Services",
  "Subscriptions",
  // Others
  "Sports & Fitness",
  "Toys & Games",
  "Books & Educational Materials",
  "Agricultural Products",
  "Other"]},
    // quantity: {type: Number, required: true},
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate product names per user (you can also use sku)
productSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);
