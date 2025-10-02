const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
// const xss = require('xss-clean')
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
require('dotenv').config();


const express = require('express');

// If you want Redis-backed rate limiter (recommended for multiple instances)
// const RateLimitRedisStore = require('rate-limit-redis');
// const Redis = require('ioredis');
// const redisClient = new Redis(process.env.REDIS_URL);
// Export a function to apply security middleware to the app

module.exports = function secureApp(app) {
  // IMPORTANT: If behind proxy/load-balancer (Heroku, Cloudflare, etc.)
  app.set('trust proxy', 1);
  // Logging (use morgan only in dev or pipe to a logger in prod)
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }
  // Basic security headers
  app.use(
    helmet({
      // you can tweak options; defaults are fine for most apps
    })
  );

  // CORS - restrict origins in production
//   const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
//   app.use(
//     cors({
//       origin: function (origin, callback) {
//         if (!origin) return callback(null, true); // allow non-browser requests like curl/postman
//         if (allowedOrigins.length === 0) return callback(null, true); // no restriction if env not set
//         if (allowedOrigins.indexOf(origin) !== -1) {
//           return callback(null, true);
//         } else {
//           return callback(new Error('Not allowed by CORS'));
//         }
//       },
//       credentials: true,
//     })
//   );

  // Prevent DNS rebinding on some hosts
  app.disable('x-powered-by');
  // Body size limits (prevents huge payload attacks)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  // Parse cookies with limit
  app.use(cookieParser());
  // Compression (save bandwidth)
  app.use(compression());
  // Prevent XSS attacks in body inputs
//   app.use(xss());
  // Prevent Mongo operator injection (e.g. {$gt:...})
  app.use(mongoSanitize());
  // Prevent HTTP parameter pollution (duplicate params)
  app.use(hpp());
  // Rate limiting: global (basic)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests from this IP, please try again later.' },
    // store: new RateLimitRedisStore({ sendCommand: (...args) => redisClient.call(...args) }) // optional
  });
  app.use(globalLimiter);
  // Slower responses for repeated rapid requests (helps mitigate abusive clients)
  const speedLimiter = slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 100, // allow 100 requests per minute, then...
    delayMs: () => 500, // begin adding 500ms of delay per request above 100
  });
  app.use(speedLimiter);
  
  // Stricter rate limiter for auth-related routes (login, register, reset)
//   const authLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 8, // limit each IP to 8 requests per window (login attempts)
//     message: { message: 'Too many login attempts. Try again later.' },
//     standardHeaders: true,
//     legacyHeaders: false,
//     // store: new RateLimitRedisStore({ sendCommand: (...args) => redisClient.call(...args) }) // optional
//   });

  // apply authLimiter where needed — you can mount it on a router or routes:
  // app.use('/api/auth/login', authLimiter); // example, set in your auth routes file
  // OPTIONAL: Very strict endpoints (webhook) — require verification signature instead of rate limiting
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120, // allow many (webhooks may be bursty); use signature verification instead of heavy limits
    skipFailedRequests: true,
  });

  
  app.use('/api/webhook', webhookLimiter);
  // Basic health endpoint rate limiting (optional)
  // app.use('/health', rateLimit({windowMs:60000, max: 60}));
  // You may also add middleware to reject traffic that looks like scanners:
  app.use((req, res, next) => {
    // Reject suspicious user agents (example)
    const ua = (req.get('user-agent') || '').toLowerCase();
    if (!ua || ua.length < 10) {
      // optionally log and reject
      // return res.status(400).json({ message: 'Bad request' });
    }
    next();
  });
  // End of security middleware
};



