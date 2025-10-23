const mongoose = require("mongoose");



const marketSquareSetupSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  whatsapp: {
    type: String,
    required: true,
  },
  termsAccepted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports= mongoose.model("MarketSquareSetup", marketSquareSetupSchema);


