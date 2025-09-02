import rateLimit from 'express-rate-limit';
import config from '../utils/config';
import logger from '../utils/logger';

// General API rate limiting
export const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests, please try again later. Limit: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000} minutes.`
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests, please try again later.`
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Stricter rate limiting for expensive operations (like geocoding/routing)
export const expensiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for expensive operations
  message: {
    success: false,
    error: {
      code: 'EXPENSIVE_OPERATION_RATE_LIMIT_EXCEEDED',
      message: 'Too many expensive operations, please try again later. Limit: 10 requests per minute.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Expensive operation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'EXPENSIVE_OPERATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many expensive operations, please try again later.'
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
});