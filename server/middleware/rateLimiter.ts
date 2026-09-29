import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Very high limit for seamless usage
  standardHeaders: true,
  legacyHeaders: false,
  // Bypass rate limiting for localhost / WebContainer / preview environments
  skip: (req) => {
    const clientIp = req.ip || req.socket.remoteAddress || '';
    return (
      process.env.NODE_ENV !== 'production' ||
      clientIp === '127.0.0.1' ||
      clientIp === '::1' ||
      clientIp.includes('127.0.0.1') ||
      req.path.startsWith('/api/admin') ||
      req.path.startsWith('/api/master') ||
      req.path.startsWith('/api/license') ||
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/api/db/status') ||
      req.path.startsWith('/api/sync') ||
      req.path.startsWith('/api/khata') ||
      req.path.startsWith('/api/version')
    );
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 429,
      success: false,
      message: 'Rate limit exceeded. Please wait a moment.'
    });
  }
});
