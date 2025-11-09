require('dotenv').config()
require('./utils/cronJobs')
require('./utils/reportSummary')
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
const quickBuddyRoute = require('./routes/quickbuddy')
const marketSquareRoute = require('./routes/marketSquareRoute')




const report = require('./routes/admin')


//SECURITY
const helmet = require('helmet');
const morgan = require('morgan');
const slowDown = require('express-slow-down');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const hpp = require('hpp');
const xssSanitize = require('./utils/xssSanitize')



const transactionPin = require('./routes/transactionPin')
const inboundTransaction = require('./QuickPay/routes/incomingTransactions')
const transactionsRoute = require('./QuickPay/routes/transactions')



//Anchor
const anchorRoutes = require('./QuickPay/routes/anchor')
const verifyBvn = require('./routes/verifyBvn')
const deliveryRoutes = require('./routes/deliveryRoutes')
const cors = require('cors')



const app = express()


//SECURITY MIDDLEWARE
// app.use(helmet())
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      frameAncestors: ["'none'"], // Blocks clickjacking entirely
      baseUri: ["'self'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

const badActors = new Map(); // ip => { count, blockedUntil }
function blockIpTemporarily(ip, seconds = 300) {
  badActors.set(ip, { blockedUntil: Date.now() + seconds * 1000 });
  console.warn(`:warning: Blocking IP ${ip} for ${seconds}s`);
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const ua = req.get("user-agent") || "";
  // Check if already blocked
  const record = badActors.get(ip);
  if (record?.blockedUntil > Date.now()) {
    return res.status(403).json({ message: "Access temporarily denied" });
  }


if (!ua || /curl|wget|python|scraper|bot|crawl|libwww/i.test(ua)) {
    const entry = badActors.get(ip) || { count: 0 };
    entry.count++;
    badActors.set(ip, entry);
    if (entry.count > 50) {
      blockIpTemporarily(ip, 600); // Block 10 minutes
      return res.status(403).json({ message: "Blocked for suspicious activity" });
    }
  }
  next();
});

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

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

app.use(xssSanitize)

app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitize(obj[key]); // recursively clean nested objects
      }
    });
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
});




connectDb()



// app.use(cors({
//     origin: ["http://localhost:3000", "https://quick-invoice-frontend-two.vercel.app/"],
//     Credential: true
// }))
const allowedOrigins = [
  "https://www.quickinvoiceng.com",
  "https://quickinvoiceng.com", // ✅ no www version too
  // "http://localhost:3000",
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

//AI ROUTES
app.use('/api/quickbuddy', quickBuddyRoute)

//MARKET SQUARE
app.use('/api/marketsquare', marketSquareRoute)



app.listen(4000, ()=>{
    console.log('listening on port 4000');
})