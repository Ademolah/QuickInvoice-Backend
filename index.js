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


//SECURITY
const helmet = require('helmet');
const morgan = require('morgan');
const slowDown = require('express-slow-down');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean')



const transactionPin = require('./routes/transactionPin')
const inboundTransaction = require('./QuickPay/routes/incomingTransactions')
const transactionsRoute = require('./QuickPay/routes/transactions')
const secureApp = require('./middleware/security-middleware')


//Anchor
const anchorRoutes = require('./QuickPay/routes/anchor')

const verifyBvn = require('./routes/verifyBvn')

const deliveryRoutes = require('./routes/deliveryRoutes')

const cors = require('cors')



const app = express()


//SECURITY MIDDLEWARE
app.use(helmet())
app.set('trust proxy', 1);
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

const speedLimiter = slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 100, // allow 100 requests per minute, then...
    delayMs: () => 500, // begin adding 500ms of delay per request above 100
});
app.use(speedLimiter);

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again later.' },
    // store: new RateLimitRedisStore({ sendCommand: (...args) => redisClient.call(...args) }) // optional
  });
app.use(globalLimiter);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(compression());
app.use(hpp());

app.use((req, res, next) => {
    // Reject suspicious user agents (example)
    const ua = (req.get('user-agent') || '').toLowerCase();
    if (!ua || ua.length < 10) {
      // optionally log and reject
      // return res.status(400).json({ message: 'Bad request' });
    }
    next();
});

// app.use(xss())
// app.use(mongoSanitize({
//   onSanitize: ({req, key}) => {
//     console.log(`This request[${key}] is sanitized`, req[key]);
    
//   }
// }));




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