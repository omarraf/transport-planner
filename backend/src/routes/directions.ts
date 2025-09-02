import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import { expensiveLimiter } from '../middleware/rateLimit';
import mapboxService from '../services/mapbox-simple';
import logger from '../utils/logger';
import { APIResponse, DirectionsRequest, RouteResult } from '../types';

const router = Router();

/**
 * POST /api/directions
 * Calculate route between two points using Mapbox Directions API
 * 
 * Body:
 * - start: [number, number] (required) - Starting coordinates [lng, lat]
 * - end: [number, number] (required) - Ending coordinates [lng, lat]
 * - profile: string (required) - Routing profile (mapbox/walking, mapbox/cycling, mapbox/driving, mapbox/driving-traffic)
 * - alternatives: boolean (optional, default: false) - Return alternative routes
 * - steps: boolean (optional, default: true) - Include turn-by-turn directions
 * - geometries: string (optional, default: 'geojson') - Geometry format
 */
router.post('/',
  expensiveLimiter, // Apply stricter rate limiting for routing
  validateRequest(schemas.directions),
  asyncHandler(async (req, res) => {
    const request: DirectionsRequest = req.body;
    const requestId = req.headers['x-request-id'] as string;
    
    logger.info('Directions request received', {
      requestId,
      start: request.start,
      end: request.end,
      profile: request.profile,
      ip: req.ip
    });

    const startTime = Date.now();
    
    try {
      const route = await mapboxService.getDirections(request);
      const duration = Date.now() - startTime;

      logger.info('Directions request completed', {
        requestId,
        start: request.start,
        end: request.end,
        profile: request.profile,
        distance: route.distance,
        routeDuration: route.duration,
        requestDuration: `${duration}ms`
      });

      const response: APIResponse<RouteResult> = {
        success: true,
        data: route,
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          cached: duration < 100 // Likely cached if very fast
        }
      };

      res.json(response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Directions request failed', {
        requestId,
        start: request.start,
        end: request.end,
        profile: request.profile,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });

      throw error; // Will be handled by global error handler
    }
  })
);

/**
 * POST /api/directions/batch
 * Calculate multiple routes with different transport modes
 * 
 * Body:
 * - start: [number, number] (required) - Starting coordinates
 * - end: [number, number] (required) - Ending coordinates  
 * - profiles: string[] (required) - Array of routing profiles to test
 */
router.post('/batch',
  expensiveLimiter,
  asyncHandler(async (req, res) => {
    const { start, end, profiles } = req.body;
    const requestId = req.headers['x-request-id'] as string;
    
    // Validate input
    if (!Array.isArray(start) || start.length !== 2 ||
        !Array.isArray(end) || end.length !== 2 ||
        !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input: start, end must be [lng, lat] arrays, profiles must be non-empty array'
        }
      });
    }

    logger.info('Batch directions request received', {
      requestId,
      start,
      end,
      profiles,
      ip: req.ip
    });

    const startTime = Date.now();
    
    try {
      // Calculate routes for all profiles in parallel
      const routePromises = profiles.map(async (profile: string) => {
        try {
          const route = await mapboxService.getDirections({ start: start as [number, number], end: end as [number, number], profile });
          return { profile, success: true, data: route };
        } catch (error) {
          return { 
            profile, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const results = await Promise.all(routePromises);
      const duration = Date.now() - startTime;

      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      logger.info('Batch directions request completed', {
        requestId,
        start,
        end,
        profiles,
        successful: successful.length,
        failed: failed.length,
        duration: `${duration}ms`
      });

      const response: APIResponse<{
        routes: typeof results;
        summary: {
          total: number;
          successful: number;
          failed: number;
        };
      }> = {
        success: true,
        data: {
          routes: results,
          summary: {
            total: results.length,
            successful: successful.length,
            failed: failed.length
          }
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Batch directions request failed', {
        requestId,
        start,
        end,
        profiles,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });

      throw error;
    }
  })
);

/**
 * GET /api/directions/profiles
 * Get available routing profiles
 */
router.get('/profiles',
  asyncHandler(async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    const profiles = [
      {
        id: 'mapbox/walking',
        name: 'Walking',
        description: 'Pedestrian routing using footpaths and sidewalks',
        icon: '🚶',
        color: '#22c55e'
      },
      {
        id: 'mapbox/cycling',
        name: 'Cycling',
        description: 'Bicycle routing using bike lanes and roads',
        icon: '🚴',
        color: '#3b82f6'
      },
      {
        id: 'mapbox/driving',
        name: 'Driving',
        description: 'Car routing using roads and highways',
        icon: '🚗',
        color: '#ef4444'
      },
      {
        id: 'mapbox/driving-traffic',
        name: 'Driving (Traffic)',
        description: 'Car routing with real-time traffic data',
        icon: '🚗',
        color: '#f59e0b'
      }
    ];

    const response: APIResponse<typeof profiles> = {
      success: true,
      data: profiles,
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  })
);

export default router;