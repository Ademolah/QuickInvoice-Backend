require('dotenv').config()
require('./utils/cronJobs')
const express = require('express')
const connectDb = require('./db/db')
const authRoutes = require('./routes/auths')
const invoiceRoutes = require('./routes/invoices')
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clientsRoute')
const paymentRoute = require('./routes/payment')
const reportsRoute = require('./routes/reports')
const inventoryRoutes = require('./routes/inventoryRoutes')
const clientPaymentsRoutes = require('./routes/clientsPayments')


const transactionPin = require('./routes/transactionPin')
const inboundTransaction = require('./QuickPay/routes/incomingTransactions')
const transactionsRoute = require('./QuickPay/routes/transactions')


//Anchor
const anchorRoutes = require('./QuickPay/routes/anchor')

const verifyBvn = require('./routes/verifyBvn')

const deliveryRoutes = require('./routes/deliveryRoutes')

const cors = require('cors')



const app = express()

connectDb()

// app.use(cors({
//     origin: ["http://localhost:3000", "https://quick-invoice-frontend-two.vercel.app/"],
//     Credential: true
// }))
const allowedOrigins = [
  "https://www.quickinvoiceng.com",
  "https://quickinvoiceng.com", // ✅ no www version too
  "http://localhost:3000",
  "https://quick-invoice-frontend-two.vercel.app",
  "https://test-quickinvoice-frontend.vercel.app",
  "https://www.test-quickinvoice-frontend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true
}));

// app.use('/api/payments/nfcWebhook', express.raw({ type: 'application/json' }));

app.use('/api/payments', paymentRoute)

app.use(express.json())



// app.use('/api/payments', clientPaymentsRoutes)
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/reports", reportsRoute)
app.use('/api/bvn', verifyBvn)
app.use('/api/transaction-pin', transactionPin)

app.use('/api/deliveries', deliveryRoutes)


//anchor routes
app.use('/api/anchor', anchorRoutes)
app.use('/api/IncomingTransaction', inboundTransaction)
app.use('/api/transactions', transactionsRoute)



app.listen(4000, ()=>{
    console.log('listening on port 4000');
})