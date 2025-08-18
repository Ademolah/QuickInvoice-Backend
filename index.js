require('dotenv').config()
const express = require('express')
const connectDb = require('./db/db')
const authRoutes = require('./routes/auths')
const invoiceRoutes = require('./routes/invoices')
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clientsRoute')
const paymentRoute = require('./routes/payment')
const reportsRoute = require('./routes/reports')

const cors = require('cors')



const app = express()

connectDb()

// app.use(cors({
//     origin: ["http://localhost:3000", "https://quick-invoice-frontend-two.vercel.app/"],
//     Credential: true
// }))
const allowedOrigins = [
  "https://bookly-frontend-fawn.vercel.app",
  "https://www.booklyio.com",
  "https://booklyio.com", // ✅ no www version too
  "http://localhost:3000",
  "https://quick-invoice-frontend-two.vercel.app"
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



app.use('/api/payments', paymentRoute)

app.use(express.json())

// app.get('/', async(req, res)={
//     res.('Welcome to QuickInvoice NG API')
// })



app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/reports", reportsRoute)



app.listen(4000, ()=>{
    console.log('listening on port 4000');
})