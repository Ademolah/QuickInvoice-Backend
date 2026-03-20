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
const shipbubbleRoute = require('./routes/shipbubbleWebhook')
const vendorRoute = require('./routes/vendorRoutes')
const marketProducts = require('./routes/marketProductRoutes')
const expensesRoutes = require("./routes/expenses")
const notificationRoutes = require('./routes/notificationRoutes')
const bookKeepingRoutes = require('./routes/bookKeepingRoutes')
const enterpriseRoutes = require('./routes/enterprise')
const supportTicketRoutes = require('./routes/supportTicketRoutes')
const adminRoutes = require('./routes/admin')

const auth = require('./middleware/authMiddleware')
const activityTracker = require('./middleware/trackActivity');

const http = require('http'); // Required for Socket.io
const { Server } = require('socket.io');


const startInvoiceReminderCron = require('./utils/invoiceCron')
const startSubscriptionExpiryCron = require('./utils/subscriptionExpiryCron')


//CRON JOBS
startSubscriptionExpiryCron()
startInvoiceReminderCron()


//PAYSTACK
const checkoutRoutes = require("./routes/checkout")
const banksRoutes = require('./routes/banks')




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
const server = http.createServer(app);

// Initialize Socket.io with CORS safety
const io = new Server(server, {
  cors: {
    origin: ["https://www.quickinvoiceng.com",
      "https://quickinvoiceng.com",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST"]
  }
});

// Make 'io' globally accessible to your controllers
global.io = io;

io.on('connection', (socket) => {
  // console.log('⚡ New Connection:', socket.id);

  // Allow users to join a "Room" based on their User ID or Ticket ID
  socket.on('join_chat', (ticketId) => {
    socket.join(ticketId);
    // console.log(`User joined room: ${ticketId}`);
  });

  socket.on('disconnect', () => {
    // console.log('🔥 User Disconnected');
  });
});


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
  console.warn(`⚠️ Blocking IP ${ip} for ${seconds}s`);
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




const allowedOrigins = [
  "https://www.quickinvoiceng.com",
  "https://quickinvoiceng.com",
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


app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json())

// app.use('/api/auth', authRoutes);

// //paystack checkout
// app.use("/api/checkout", checkoutRoutes)
// app.use("/api/banks", banksRoutes)

// app.use(auth)
// app.use(activityTracker);

// // app.use('/api/payments', clientPaymentsRoutes)
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/users', userRoutes);

// app.use('/api/invoices', invoiceRoutes);
// app.use("/api/clients", clientRoutes);
// app.use("/api/reports", reportsRoute)
// app.use('/api/bvn', verifyBvn)
// app.use('/api/transaction-pin', transactionPin)
// app.use("/api/expenses", expensesRoutes)
// app.use('/api/support', supportTicketRoutes)
// app.use('/api/admin', adminRoutes)

// app.use('/api/deliveries', deliveryRoutes)


// //anchor routes
// app.use('/api/anchor', anchorRoutes)
// app.use('/api/IncomingTransaction', inboundTransaction)
// app.use('/api/transactions', transactionsRoute)

// //AI ROUTES
// app.use('/api/quickbuddy', quickBuddyRoute)

// //MARKET SQUARE
// app.use('/api/marketsquare', marketSquareRoute)
// app.use('/api/market-products', marketProducts)



// //Logistics
// app.use("/api/shipbubble", shipbubbleRoute)

// app.use('/api/sandbox', require('./routes/sandboxWebhookShip'))

// app.use('/api/vendor', vendorRoute)

// //notification
// app.use("/api/notifications", notificationRoutes)
// app.use('/api/bookkeeping', bookKeepingRoutes)

// //enterprise
// app.use('/api/enterprise', enterpriseRoutes)




// --- 1. THE PUBLIC LAYER (No Auth Required) ---
// Login, Registration, and Password Reset
app.use('/api/auth', authRoutes);

// External Webhooks (These services don't send your JWT token!)
app.use('/api/sandbox', require('./routes/sandboxWebhookShip'));
app.use('/api/IncomingTransaction', inboundTransaction);

// Checkout & Onboarding Support
app.use("/api/checkout", checkoutRoutes);
app.use("/api/banks", banksRoutes); // Fixes the Settings/Onboarding 401s

// Marketplace (If you want guests to browse before logging in)
app.use('/api/marketsquare', marketSquareRoute);
app.use('/api/market-products', marketProducts);


// --- 2. THE SECURITY GATE (The "Checkpoint") ---
// Everything below this line will be identified and tracked in the Audit Feed
app.use(auth); 
app.use(activityTracker);


// --- 3. THE PRIVATE LAYER (Auth & Tracking ACTIVE) ---

// Core User & Finance
app.use('/api/users', userRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/reports", reportsRoute)
app.use("/api/expenses", expensesRoutes);
app.use('/api/transactions', transactionsRoute);
app.use('/api/bookkeeping', bookKeepingRoutes);

// Verification & Security
app.use('/api/bvn', verifyBvn);
app.use('/api/transaction-pin', transactionPin);

// Operations & Admin
app.use('/api/admin', adminRoutes);
app.use('/api/support', supportTicketRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use("/api/notifications", notificationRoutes);

// Logistics & External Integrations
app.use('/api/deliveries', deliveryRoutes);
app.use("/api/shipbubble", shipbubbleRoute);
app.use('/api/vendor', vendorRoute);
app.use('/api/anchor', anchorRoutes);
app.use('/api/enterprise', enterpriseRoutes);

// AI Services
app.use('/api/quickbuddy', quickBuddyRoute);



server.listen(4000, () => {
  console.log('🚀 Premium Server (with Socket.io) listening on port 4000');
});