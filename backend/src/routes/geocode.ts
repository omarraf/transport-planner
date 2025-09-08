import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { geocodingLimiter } from '../middleware/rateLimit';
import mapboxService from '../services/mapbox-simple';
import logger from '../utils/logger';
import { APIResponse, GeocodingRequest, Location } from '../types';

const router = Router();

/**
 * POST /api/geocode
 * Search for locations using Mapbox Geocoding API
 * 
 * Body:
 * - query: string (required) - The search query
 * - limit: number (optional, default: 5) - Number of results to return
 * - proximity: [number, number] (optional) - Bias results towards this location
 * - bbox: [number, number, number, number] (optional) - Bounding box to limit results
 * - types: string[] (optional) - Filter by place types
 */
router.post('/', 
  geocodingLimiter, // Apply geocoding-specific rate limiting
  validateRequest(schemas.geocoding),
  asyncHandler(async (req, res) => {
    const request: GeocodingRequest = req.body;
    const requestId = req.headers['x-request-id'] as string;
    
    logger.info('Geocoding request received', {
      requestId,
      query: request.query,
      limit: request.limit,
      ip: req.ip
    });

    const startTime = Date.now();
    
    try {
      const locations = await mapboxService.geocode(request);
      const duration = Date.now() - startTime;

      logger.info('Geocoding request completed', {
        requestId,
        query: request.query,
        resultsCount: locations.length,
        duration: `${duration}ms`
      });

      const response: APIResponse<Location[]> = {
        success: true,
        data: locations,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: duration < 50 // Likely cached if very fast
        }
      };

      res.json(response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Geocoding request failed', {
        requestId,
        query: request.query,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });

      throw error; // Will be handled by global error handler
    }
  })
);

/**
 * GET /api/geocode/test
 * Test the geocoding service with a simple query
 */
router.get('/test',
  asyncHandler(async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;
    
    try {
      const testResult = await mapboxService.geocode({ query: 'London', limit: 1 });
      
      const response: APIResponse<{
        status: string;
        testQuery: string;
        resultsCount: number;
        sampleResult?: Location;
      }> = {
        success: true,
        data: {
          status: 'working',
          testQuery: 'London',
          resultsCount: testResult.length,
          sampleResult: testResult[0]
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      logger.error('Geocoding test failed', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  })
);

export default router;