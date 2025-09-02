import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

import config from './utils/config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimit';

// Import routes
import geocodeRouter from './routes/geocode';
import directionsRouter from './routes/directions';
import metricsRouter from './routes/metrics';

const app = express();

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      requestId: req.headers['x-request-id']
    });
  });
  
  next();
});

// Rate limiting
app.use('/api', generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.server.env,
      version: process.env.npm_package_version || '1.0.0'
    },
    meta: {
      requestId: req.headers['x-request-id'] as string,
      timestamp: new Date().toISOString()
    }
  });
});

// API routes
app.use('/api/geocode', geocodeRouter);
app.use('/api/directions', directionsRouter);
app.use('/api/metrics', metricsRouter);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found`
    },
    meta: {
      requestId: req.headers['x-request-id'] as string,
      timestamp: new Date().toISOString()
    }
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.server.port;

app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: config.server.env,
    corsOrigin: config.server.corsOrigin,
    cacheEnabled: config.cache.geocoding.enabled
  });
  
  console.log(`
🚀 Transport Planner Backend Server Started!
   
📍 Server: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/health
🌍 Environment: ${config.server.env}
📊 Cache: ${config.cache.geocoding.enabled ? 'Enabled' : 'Disabled'}
🔒 Rate Limiting: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000}min

📋 API Endpoints:
   POST /api/geocode     - Location search
   POST /api/directions  - Route calculation  
   POST /api/metrics     - Environmental metrics
   
${config.mapbox.accessToken === 'INSERT_YOUR_MAPBOX_TOKEN_HERE' ? 
  '⚠️  Warning: Please set MAPBOX_ACCESS_TOKEN in .env.local' : 
  '✅ Mapbox API: Configured'}
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

export default app;