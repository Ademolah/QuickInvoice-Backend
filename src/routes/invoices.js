const express = require('express');
const Invoice = require('../models/Invoice');
const auth = require('../middleware/authMiddleware');
const User =  require('../models/Users')
const PDFDocument = require('pdfkit');
const InvoiceLog = require('../models/InvoiceLog')
const checkUsage = require('../middleware/checkUsage')

const router = express.Router();

// Create invoice
router.post('/', auth, async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, items = [], tax = 0, discount = 0, dueDate, notes } = req.body;
    if (!clientName || !items.length) return res.status(400).json({ message: 'Client and items required' });
    const subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
    const total = Math.max(0, subtotal + tax - discount);
    
   

    const computedItems = items.map(it => ({ ...it, total: it.quantity * it.unitPrice }));
    const inv = await Invoice.create({
      userId: req.userId, clientName, clientEmail, clientPhone, items: computedItems, subtotal, tax, discount, total, status: 'sent', dueDate, notes
    });

    console.log(subtotal)
    console.log(total);
    console.log(tax)
    console.log(typeof(total))
    
    res.json(inv);
  } catch (e) {
    console.error(e);
  res.status(500).json({ message: 'Server error' });
  }
});

// List invoices for user
router.get('/', auth, async (req, res) => {
  try {
    const list = await Invoice.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(list);
  } catch (e) {
    console.error(e);
  res.status(500).json({ message: 'Server error' });
  }
});

// Get one
router.get('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
  if (!inv) return res.status(404).json({ message: 'Not found' });
  res.json(inv);
  } catch (e) {
    console.error(e);
  res.status(500).json({ message: 'Server error' });
  }
});

// Mark paid
router.patch('/:id/pay', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, { status: 'paid' }, { new: true });
  if (!inv) return res.status(404).json({ message: 'Not found' });
  res.json(inv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const inv = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!inv) return res.status(404).json({ message: 'Not found' });
  res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update invoice
router.put('/:id', auth, async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, items = [], tax = 0, discount = 0, dueDate, notes, status } = req.body;
    if (!clientName || !items.length) return res.status(400).json({ message: 'Client and items required' });

    const existing = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const statusToUpdate = status || existing.status;

    
    const subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
    const total = Math.max(0, subtotal + tax - discount);
    const computedItems = items.map(it => ({ ...it, total: it.quantity * it.unitPrice }));

    // const updatedInvoice = await Invoice.findOneAndUpdate(
    //   { _id: req.params.id, userId: req.userId },
    //   { clientName, clientEmail, clientPhone, items: computedItems, subtotal, tax, discount, total, status, dueDate, notes },
    //   { new: true }
    // );
    const updatedInvoice = await Invoice.findOneAndUpdate(
        { _id: req.params.id, userId: req.userId },
        { clientName, clientEmail, clientPhone, items: computedItems, subtotal, tax, discount, total, status: statusToUpdate, dueDate, notes },
        { new: true }
    );

    if (!updatedInvoice) return res.status(404).json({ message: 'Not found' });
    res.json(updatedInvoice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // const user = await User.findById(req.userId);
    const user = await User.findById(invoice.userId);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });


    const accountDetails = user.accountDetails || {}

    // Stream PDF to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice._id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).text(user.businessName || 'Your Business', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text(`Invoice to: ${invoice.clientName}`);
    if(invoice.clientEmail) doc.text(`Email: ${invoice.clientEmail}`);
    if(invoice.clientPhone) doc.text(`Phone: ${invoice.clientPhone}`);
    doc.moveDown();

    // Invoice Table
    doc.fontSize(14).text('Items:', { underline: true });
    invoice.items.forEach((item, idx) => {
      doc.text(
        `${idx + 1}. ${item.description} - ${item.quantity} x ${item.unitPrice} = ${item.total}`
      );
    });

    doc.moveDown();
    doc.text(`Subtotal: ${invoice.subtotal}`);
    doc.text(`Tax: ${invoice.tax}`);
    doc.text(`Discount: ${invoice.discount}`);
    doc.text(`Total: ${invoice.total}`);
    doc.text(`Due Date: ${invoice.dueDate ? invoice.dueDate.toDateString() : 'N/A'}`);
    doc.text(`Status: ${invoice.status}`);

    doc.moveDown();

    doc.fontSize(14).text(`Bank: ${accountDetails.bankName || '-'}`);
    doc.text(`Account Number: ${accountDetails.accountNumber || '-'}`);
    doc.text(`Account Name: ${accountDetails.accountName || '-'}`);
    doc.moveDown();

    if(invoice.notes) doc.text(`Notes: ${invoice.notes}`);

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Protected route to log invoice/receipt creation
// router.post("/log", auth, checkUsage, async (req, res) => {
//   const { type } = req.body; // "invoice" or "receipt"

//   if (!["invoice", "receipt"].includes(type)) {
//     return res.status(400).json({ message: "Invalid type" });
//   }

//   const log = new InvoiceLog({
//     user: req.user.id,
//     type,
//   });

//   await log.save();

//   // Update usage counter
//   const user = req.userDoc; // we can preload this in checkUsage for efficiency
//   if (type === "invoice") {
//     user.usage.invoicesThisMonth++;
//   } else {
//     user.usage.receiptsThisMonth++;
//   }
//   await user.save();

//   res.json({ success: true, message: `${type} logged successfully` });
// });

// backend/routes/invoices.js (or wherever your log route is)
router.post("/log", auth, checkUsage, async (req, res) => {
  try {
    const { type } = req.body;
    const userId = req.user.id; // assuming auth middleware

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    const log = new InvoiceLog({
          user: req.user.id,
          type,
        });

    await log.save();


      // const user = req.userDoc; // we can preload this in checkUsage for efficiency
      // if (type === "invoice") {
      //   user.usage.invoicesThisMonth++;
      // } else {
      //   user.usage.receiptsThisMonth++;
      // }

        

    // reset usage if new month
    const now = new Date();
    if (new Date(user.usage.lastReset).getMonth() !== now.getMonth()) {
      user.usage.invoicesThisMonth = 0;
      user.usage.receiptsThisMonth = 0;
      user.usage.lastReset = now;
    }

    if (type === "invoice") {
      user.usage.invoicesThisMonth += 1;
    } else if (type === "receipt") {
      user.usage.receiptsThisMonth += 1;
    }
    console.log(user);

    await user.save()
    
 

    // ✅ Always return JSON so frontend doesn’t choke
    res.json({ success: true, usage: user.usage });
  } catch (err) {
    console.error("Error logging usage:", err);
    res.status(500).json({ success: false, error: "Server error logging usage" });
  }
});



module.exports = router;