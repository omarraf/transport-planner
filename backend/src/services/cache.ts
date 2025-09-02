import NodeCache from 'node-cache';
import config from '../utils/config';
import logger from '../utils/logger';

// Create cache instances for different data types
const geocodingCache = new NodeCache({ 
  stdTTL: config.cache.geocoding.ttl,
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false
});

const directionsCache = new NodeCache({ 
  stdTTL: config.cache.directions.ttl,
  checkperiod: 300, // Check for expired keys every 5 minutes
  useClones: false
});

// Cache statistics
let cacheStats = {
  geocoding: { hits: 0, misses: 0 },
  directions: { hits: 0, misses: 0 }
};

// Geocoding cache methods
export const geocodingCacheService = {
  get: (key: string): any => {
    if (!config.cache.geocoding.enabled) return null;
    
    const data = geocodingCache.get(key);
    if (data) {
      cacheStats.geocoding.hits++;
      logger.debug('Geocoding cache hit', { key });
      return data;
    } else {
      cacheStats.geocoding.misses++;
      logger.debug('Geocoding cache miss', { key });
      return null;
    }
  },

  set: (key: string, data: any, ttl?: number): boolean => {
    if (!config.cache.geocoding.enabled) return false;
    
    const success = geocodingCache.set(key, data, ttl || config.cache.geocoding.ttl);
    if (success) {
      logger.debug('Geocoding data cached', { key, ttl: ttl || config.cache.geocoding.ttl });
    }
    return success;
  },

  del: (key: string): number => {
    return geocodingCache.del(key);
  },

  clear: (): void => {
    geocodingCache.flushAll();
    logger.info('Geocoding cache cleared');
  }
};

// Directions cache methods
export const directionsCacheService = {
  get: (key: string): any => {
    if (!config.cache.directions.enabled) return null;
    
    const data = directionsCache.get(key);
    if (data) {
      cacheStats.directions.hits++;
      logger.debug('Directions cache hit', { key });
      return data;
    } else {
      cacheStats.directions.misses++;
      logger.debug('Directions cache miss', { key });
      return null;
    }
  },

  set: (key: string, data: any, ttl?: number): boolean => {
    if (!config.cache.directions.enabled) return false;
    
    const success = directionsCache.set(key, data, ttl || config.cache.directions.ttl);
    if (success) {
      logger.debug('Directions data cached', { key, ttl: ttl || config.cache.directions.ttl });
    }
    return success;
  },

  del: (key: string): number => {
    return directionsCache.del(key);
  },

  clear: (): void => {
    directionsCache.flushAll();
    logger.info('Directions cache cleared');
  }
};

// Utility functions
export const generateGeocodingCacheKey = (query: string, options?: any): string => {
  const normalized = query.toLowerCase().trim();
  const optionsStr = options ? JSON.stringify(options) : '';
  return `geocoding:${normalized}:${optionsStr}`;
};

export const generateDirectionsCacheKey = (
  start: [number, number], 
  end: [number, number], 
  profile: string
): string => {
  return `directions:${start[0]},${start[1]}:${end[0]},${end[1]}:${profile}`;
};

// Cache statistics
export const getCacheStats = () => ({
  ...cacheStats,
  geocoding: {
    ...cacheStats.geocoding,
    size: geocodingCache.keys().length,
    hitRate: cacheStats.geocoding.hits / (cacheStats.geocoding.hits + cacheStats.geocoding.misses) || 0
  },
  directions: {
    ...cacheStats.directions,
    size: directionsCache.keys().length,
    hitRate: cacheStats.directions.hits / (cacheStats.directions.hits + cacheStats.directions.misses) || 0
  }
});

// Clear all caches
export const clearAllCaches = (): void => {
  geocodingCacheService.clear();
  directionsCacheService.clear();
  cacheStats = {
    geocoding: { hits: 0, misses: 0 },
    directions: { hits: 0, misses: 0 }
  };
  logger.info('All caches cleared');
};