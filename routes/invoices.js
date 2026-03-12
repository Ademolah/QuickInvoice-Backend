const express = require('express');
const Invoice = require('../models/Invoice');
const auth = require('../middleware/authMiddleware');
const User =  require('../models/Users')
const PDFDocument = require('pdfkit');
const InvoiceLog = require('../models/InvoiceLog')
const checkUsage = require('../middleware/checkUsage')
const Product = require('../models/Products')
const trackActivity = require('../middleware/trackActivity')
const BookKeepingTransaction = require('../models/BookKeepingTransactions'); 

const router = express.Router();

// Create invoice

router.post('/', auth, trackActivity, async (req, res) => {
  try {
    const {
      clientName, clientEmail, clientPhone, items = [],
      tax = 0, discount = 0, dueDate, notes, outstandingBalance
    } = req.body;

    if (!clientName || !items.length) {
      return res.status(400).json({ message: 'Client name and items are required' });
    }

    // 1. Fetch User to get the current business context
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Calculate totals
    const subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
    const total = Math.max(0, subtotal + tax - discount);
    
    const computedItems = items.map(it => ({
      ...it,
      total: it.quantity * it.unitPrice
    }));

    const finalOutstanding = !isNaN(Number(outstandingBalance)) ? Number(outstandingBalance) : 0;

    // 2. Create Invoice with the businessId stamp
    const inv = await Invoice.create({
      userId: req.userId,
      businessId: user.activeBusinessId, // 👈 THE CONTEXT STAMP
      clientName,
      clientEmail,
      clientPhone,
      items: computedItems,
      subtotal,
      tax,
      discount,
      total,
      outstandingBalance: finalOutstanding,
      status: 'sent',
      dueDate,
      notes
    });

    res.json(inv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});



//edit invoice 

router.put('/:id', auth, trackActivity, async (req, res) => {
  try {
    const {
      clientName, clientEmail, clientPhone, items,
      tax, discount, dueDate, notes, outstandingBalance, status
    } = req.body;

    // 1. Find the invoice and verify ownership
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    // Security Guard: Ensure the user owns this invoice
    if (invoice.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Integrity Guard: Prevent editing if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ 
        message: 'Forbidden: Paid invoices cannot be edited for data integrity.' 
      });
    }

    // 2. Recalculate math (Never trust the frontend with totals)
    let subtotal = invoice.subtotal;
    let total = invoice.total;
    let computedItems = invoice.items;

    if (items && items.length > 0) {
      subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
      computedItems = items.map(it => ({
        ...it,
        total: it.quantity * it.unitPrice
      }));
    }

    // Use provided tax/discount or fall back to existing values
    const finalTax = tax !== undefined ? tax : invoice.tax;
    const finalDiscount = discount !== undefined ? discount : invoice.discount;
    total = Math.max(0, subtotal + finalTax - finalDiscount);

    // 3. Perform the Surgical Update
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          clientName: clientName || invoice.clientName,
          clientEmail: clientEmail || invoice.clientEmail,
          clientPhone: clientPhone || invoice.clientPhone,
          items: computedItems,
          subtotal,
          tax: finalTax,
          discount: finalDiscount,
          total,
          outstandingBalance: outstandingBalance !== undefined ? outstandingBalance : invoice.outstandingBalance,
          status: status || invoice.status,
          dueDate: dueDate || invoice.dueDate,
          notes: notes || invoice.notes,
          lastEditedAt: new Date() // Premium touch: track edit history
        }
      },
      { new: true } // Return the modified document
    );

    res.json(updatedInvoice);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error updating invoice' });
  }
});




// List invoices for specific context
router.get('/', auth, trackActivity, async (req, res) => {
  try {
    // 1. Fetch user to see what context they are in
    const user = await User.findById(req.userId);
    
    // 2. Filter by userId AND businessId
    const list = await Invoice.find({ 
      userId: req.userId, 
      businessId: user.activeBusinessId // 👈 THE FILTER
    }).sort({ createdAt: -1 });

    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get one (Security check)
router.get('/:id', auth, trackActivity, async (req, res) => {
  try {
    // We search by ID and userId. We don't necessarily need businessId here 
    // because the ID is unique, but it's good practice.
    const inv = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
    if (!inv) return res.status(404).json({ message: 'Not found' });
    res.json(inv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});


// Mark paid (with Inventory Deduction & Bookkeeping Integration)
router.patch('/:id/pay', auth, trackActivity, async (req, res) => {
  try {
    // 1. Find invoice (Security: must match userId)
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.userId });
    if (!invoice) return res.status(404).json({ message: 'Not found' });
    if (invoice.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    let lowStockWarnings = [];

    // 2. Loop and deduct inventory from the SPECIFIC business context
    for (const item of invoice.items) {
      const product = await Product.findOne({
        userId: req.userId,
        businessId: invoice.businessId, // 👈 Scoped to the same business as the invoice
        name: new RegExp(`^${item.description}$`, 'i')
      });

      if (product) {
        product.stock = (product.stock || 0) - item.quantity;
        if (product.stock < 5) lowStockWarnings.push(`${item.description} stock low (${product.stock} left)`);
        await product.save();
      }
    }

    invoice.status = 'paid';
    await invoice.save();

    // 3. Automate Bookkeeping with businessId context
    try {
      await BookKeepingTransaction.create({
        userId: req.userId,
        businessId: invoice.businessId, // 👈 Ensures income hits the right entity's books
        type: 'INCOME',
        category: 'Sales',
        amount: invoice.total || 0,
        date: new Date(),
        description: `Payment for Invoice #${invoice.clientName}`,
        referenceId: invoice._id,
        paymentMethod: 'Bank Transfer'
      });
    } catch (error) {
      console.error("Bookkeeping entry failed:", error);
    }

    res.json({ ...invoice.toObject(), lowStockWarnings, message: "Payment recorded" });
  } catch (e) {
    res.status(500).json({ message: 'Server error' });
  }
});



// Delete
router.delete('/:id', auth,trackActivity, async (req, res) => {
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
router.put('/:id', auth,trackActivity, async (req, res) => {
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

router.get('/:id/pdf', auth,trackActivity, async (req, res) => {
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




// backend/routes/invoices.js (or wherever your log route is)

router.post("/log", auth, checkUsage, trackActivity, async (req, res) => {
  try {
    const { type } = req.body;
    const user = await User.findById(req.userId);
    
    const log = new InvoiceLog({
      user: req.userId,
      businessId: user.activeBusinessId, // 👈 Log WHICH business created the doc
      type
    });
    await log.save();

    // Reset and increment logic (remains as you had it)
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

    
    await user.save();
    res.json({ success: true, usage: user.usage });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
});



module.exports = router;