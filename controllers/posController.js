const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Products');
const User = require('../models/Users')

exports.processPOSSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, paymentDetails, totalAmount } = req.body;
    const user = await User.findById(req.userId)

    // 1. GENERATE UNIQUE RECEIPT NUMBER
    const receiptNumber = `QN-POS-${Date.now()}`;

    // 2. VALIDATE & UPDATE INVENTORY (The Security Core)
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      
      if (!product) throw new Error(`Product ${item.name} not found.`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Remaining: ${product.stockQuantity}`);
      }
       
      const saleValue = item.quantity * product.price;
      // Decrement stock
      product.stock -= item.quantity;
      product.sold = (product.sold || 0) + saleValue;
      await product.save({ session });
    }

    // 3. CREATE THE SALE RECORD
    const newSale = await Sale.create([{
      receiptNumber,
      cashierId: req.userId,
      items,
      totalAmount,
      businessId: user.activeBusinessId,
      paymentDetails
    }], { session });

    // 4. COMMIT EVERYTHING
    await session.commitTransaction();
    session.endSession();

    // 🚀 REAL-TIME EMIT: Update Admin Dashboard instantly
    global.io.emit('new_pos_sale', {
      amount: totalAmount,
      cashier: req.user.name,
      time: new Date()
    });

    res.status(201).json({ success: true, sale: newSale[0] });

  } catch (error) {
    // 🛑 ROLLBACK: If anything failed, inventory is NOT decreased
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

// exports.processPOSSale = async (req, res) => {
// //   const session = await mongoose.startSession();
// //   session.startTransaction();

//   try {
//     const { items, paymentDetails, totalAmount } = req.body;
//     const receiptNumber = `QN-POS-${Date.now()}`;
//     const user = await User.findById(req.userId)

//     for (const item of items) {
//       // Remove .session(session)
//       const product = await Product.findById(item.productId); 
      
//       if (!product) throw new Error(`Product ${item.name} not found.`);
//       if (product.stock < item.quantity) {
//         throw new Error(`Insufficient stock for ${product.name}`);
//       }

//       const saleValue = item.quantity * product.price;

//       // 2. Update Stock (Decrease) and Sold Value (Increase)
//       product.stock -= item.quantity;
//       product.sold = (product.sold || 0) + saleValue;
//       await product.save(); // Remove { session }
//     }

//     const newSale = await Sale.create([{
//       receiptNumber,
//       cashierId: req.userId,
//       items,
//       totalAmount,
//       businessId: user.activeBusinessId,
//       paymentDetails
//     }]); // Remove { session }

//     // await session.commitTransaction();
//     // session.endSession();

//     global.io.emit('new_pos_sale', { amount: totalAmount });
//     res.status(201).json({ success: true, sale: newSale[0] });

//   } catch (error) {
//     // await session.abortTransaction();
//     // session.endSession();
//     res.status(400).json({ success: false, message: error.message });
//   }
// };



