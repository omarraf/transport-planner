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

// Rate limiting for geocoding operations (more permissive for autocomplete)
export const geocodingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 geocoding requests per minute (allows for typing)
  message: {
    success: false,
    error: {
      code: 'GEOCODING_RATE_LIMIT_EXCEEDED',
      message: 'Too many location searches, please try again later. Limit: 100 requests per minute.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Geocoding rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'GEOCODING_RATE_LIMIT_EXCEEDED',
        message: 'Too many location searches, please try again later.'
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Rate limiting for routing operations (stricter for expensive calculations)
export const routingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 route calculations per minute
  message: {
    success: false,
    error: {
      code: 'ROUTING_RATE_LIMIT_EXCEEDED',
      message: 'Too many route calculations, please try again later. Limit: 20 requests per minute.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Routing rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: {
        code: 'ROUTING_RATE_LIMIT_EXCEEDED',
        message: 'Too many route calculations, please try again later.'
      },
      meta: {
        requestId: req.headers['x-request-id'] as string || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Keep the old expensiveLimiter for backward compatibility (metrics endpoint)
export const expensiveLimiter = routingLimiter;