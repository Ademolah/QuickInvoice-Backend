const Log = require('../models/Logs');
const User = require('../models/Users');
// Middleware to track user activity
const trackActivity = async (req, res, next) => {
  try {
    // console.log("Track activity middlrware reached ", req.method, req.originalUrl);
    
    const userId = req.userId; // assuming req.user is set from auth middleware
    const user = await User.findById(userId)

    if (!user) return next();
    // Capture endpoint
    const endpoint = req.originalUrl;
    // Check if user just logged in
    if (req.method === 'POST' && endpoint.includes('/login')) {
      await Log.create({
        message: `User ${user.email} logged in`,
        level: 'info',
        meta: {
          userId: user._id.toString(),
          email: user.email,
          name: user.name,
          loginAt: new Date()
        }
      });
    }
    // Check if user is logging out
    if (req.method === 'POST' && endpoint.includes('/logout')) {
      // Find last login log without logout
      const lastLoginLog = await Log.findOne({
        'meta.userId': user._id.toString(),
        'meta.logoutAt': { $exists: false }
      }).sort({ createdAt: -1 });
      if (lastLoginLog) {
        lastLoginLog.meta.logoutAt = new Date();
        lastLoginLog.meta.duration = Math.floor((lastLoginLog.meta.logoutAt - lastLoginLog.meta.loginAt) / 1000); // in seconds
        await lastLoginLog.save();
        await Log.create({
          message: `User ${user.email} logged out`,
          level: 'info',
          meta: {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            duration: lastLoginLog.meta.duration
          }
        });
      }
    }
    // Track endpoint hit
    // console.log('Endpoint hit...');
    
    await Log.create({
      message: `User ${user.email} accessed ${endpoint}`,
      level: 'info',
      meta: {
        userId: user._id,
        email: user.email,
        name: user.name,
        endpoint
      }
    });
    next();
    // console.log("End of track activity middleware...");
    
  } catch (err) {
    console.error('Activity log error', err);
    next();
  }
};

module.exports = trackActivity;