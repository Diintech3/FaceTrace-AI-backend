const rateLimit = {};

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 20; // 20 requests per minute

  if (!rateLimit[ip]) {
    rateLimit[ip] = { count: 1, resetTime: now + windowMs };
    return next();
  }

  if (now > rateLimit[ip].resetTime) {
    rateLimit[ip] = { count: 1, resetTime: now + windowMs };
    return next();
  }

  if (rateLimit[ip].count >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateLimit[ip].resetTime - now) / 1000)
    });
  }

  rateLimit[ip].count++;
  next();
};

module.exports = rateLimiter;
