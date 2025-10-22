const mongoose = require("mongoose");


const marketProductSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String, // Cloudinary URL
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


module.exports= mongoose.model("MarketProduct", marketProductSchema);









