import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

interface Config {
  server: {
    port: number;
    env: string;
    corsOrigin: string[];
  };
  mapbox: {
    accessToken: string;
    baseUrl: string;
  };
  google: {
    placesApiKey?: string;
  };
  cache: {
    geocoding: {
      ttl: number;  // Time to live in seconds
      enabled: boolean;
    };
    directions: {
      ttl: number;
      enabled: boolean;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.BACKEND_PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_URL 
      ? [process.env.FRONTEND_URL] 
      : ['http://localhost:3000']
  },
  mapbox: {
    accessToken: process.env.MAPBOX_ACCESS_TOKEN || 'INSERT_YOUR_MAPBOX_TOKEN_HERE',
    baseUrl: process.env.MAPBOX_BASE_URL || 'https://api.mapbox.com'
  },
  google: {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY
  },
  cache: {
    geocoding: {
      ttl: parseInt(process.env.CACHE_GEOCODING_TTL || '86400', 10), // 24 hours
      enabled: process.env.ENABLE_CACHE !== 'false'
    },
    directions: {
      ttl: parseInt(process.env.CACHE_DIRECTIONS_TTL || '3600', 10), // 1 hour
      enabled: process.env.ENABLE_CACHE !== 'false'
    }
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableConsole: process.env.ENABLE_CONSOLE_LOGGING !== 'false',
    enableFile: process.env.ENABLE_FILE_LOGGING === 'true'
  }
};

// Validation
if (config.mapbox.accessToken === 'INSERT_YOUR_MAPBOX_TOKEN_HERE') {
  console.warn('⚠️  Warning: Using placeholder Mapbox token. Please set MAPBOX_ACCESS_TOKEN in .env.local');
}

if (config.server.env === 'production') {
  if (!config.mapbox.accessToken || config.mapbox.accessToken.includes('INSERT_YOUR')) {
    throw new Error('Mapbox access token is required in production');
  }
}

export default config;