import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, schemas } from '../middleware/validation';
import emissionsCalculator, { transportModes } from '../services/emissions';
import logger from '../utils/logger';
import { APIResponse, MetricsRequest, RouteMetrics } from '../types';

const router = Router();

/**
 * POST /api/metrics
 * Calculate environmental and cost metrics for a route
 * 
 * Body:
 * - distance: number (required) - Distance in meters
 * - mode: TransportModeId (required) - Transport mode
 * - duration: number (optional) - Duration in seconds
 */
router.post('/',
  validateRequest(schemas.metrics),
  asyncHandler(async (req, res) => {
    const request: MetricsRequest = req.body;
    const requestId = req.headers['x-request-id'] as string;
    
    logger.info('Metrics calculation request received', {
      requestId,
      distance: request.distance,
      mode: request.mode,
      duration: request.duration,
      ip: req.ip
    });

    const startTime = Date.now();
    
    try {
      const metrics = emissionsCalculator.calculateMetrics(request);
      const duration = Date.now() - startTime;

      logger.info('Metrics calculation completed', {
        requestId,
        mode: request.mode,
        distance: request.distance,
        carbonEmissions: metrics.carbonEmissions,
        estimatedCost: metrics.estimatedCost,
        environmentalRating: metrics.environmentalRating,
        duration: `${duration}ms`
      });

      const response: APIResponse<RouteMetrics> = {
        success: true,
        data: metrics,
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Metrics calculation failed', {
        requestId,
        distance: request.distance,
        mode: request.mode,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      });

      throw error; // Will be handled by global error handler
    }
  })
);

/**
 * POST /api/metrics/compare
 * Compare metrics across multiple transport modes for the same route
 * 
 * Body:
 * - distance: number (required) - Distance in meters
 * - modes: TransportModeId[] (required) - Array of transport modes to compare
 * - duration: number (optional) - Duration in seconds
 */
router.post('/compare',
  asyncHandler(async (req, res) => {
    const { distance, modes, duration } = req.body;
    const requestId = req.headers['x-request-id'] as string;
    
    // Validate input
    if (typeof distance !== 'number' || distance < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Distance must be a non-negative number'
        }
      });
    }

    if (!Array.isArray(modes) || modes.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Modes must be a non-empty array'
        }
      });
    }

    logger.info('Metrics comparison request received', {
      requestId,
      distance,
      modes,
      duration,
      ip: req.ip
    });

    const startTime = Date.now();
    
    try {
      const comparison = emissionsCalculator.compareTransportModes(distance, modes);
      const requestDuration = Date.now() - startTime;

      // Find best and worst options
      const bestOption = comparison[0]; // Already sorted by emissions
      const worstOption = comparison[comparison.length - 1];
      const savings = worstOption.carbonEmissions - bestOption.carbonEmissions;

      logger.info('Metrics comparison completed', {
        requestId,
        distance,
        modes,
        bestMode: bestOption.mode,
        worstMode: worstOption.mode,
        carbonSavings: savings,
        duration: `${requestDuration}ms`
      });

      const response: APIResponse<{
        comparison: typeof comparison;
        summary: {
          bestOption: typeof bestOption;
          worstOption: typeof worstOption;
          carbonSavings: number;
          costSavings: number;
          recommendations: ReturnType<typeof emissionsCalculator.getRecommendations>;
        };
      }> = {
        success: true,
        data: {
          comparison,
          summary: {
            bestOption,
            worstOption,
            carbonSavings: savings,
            costSavings: worstOption.estimatedCost - bestOption.estimatedCost,
            recommendations: emissionsCalculator.getRecommendations(distance / 1000)
          }
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString()
        }
      };

      res.json(response);

    } catch (error) {
      const requestDuration = Date.now() - startTime;
      
      logger.error('Metrics comparison failed', {
        requestId,
        distance,
        modes,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${requestDuration}ms`
      });

      throw error;
    }
  })
);

/**
 * GET /api/metrics/transport-modes
 * Get available transport modes with their properties
 */
router.get('/transport-modes',
  asyncHandler(async (req, res) => {
    const requestId = req.headers['x-request-id'] as string;

    const modes = Object.values(transportModes).map(mode => ({
      ...mode,
      // Add additional display information
      emissionsDescription: mode.emissionsFactor === 0 
        ? 'Zero emissions'
        : `${mode.emissionsFactor} kg CO2 per km`,
      costDescription: mode.costFactor === 0 
        ? 'Free'
        : `~$${mode.costFactor.toFixed(2)} per km`,
      healthBenefits: mode.caloriesFactor 
        ? `Burns ~${mode.caloriesFactor} calories per km`
        : undefined
    }));

    const response: APIResponse<typeof modes> = {
      success: true,
      data: modes,
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  })
);

/**
 * GET /api/metrics/recommendations/:distance
 * Get transport mode recommendations for a specific distance
 * 
 * Params:
 * - distance: number - Distance in meters
 */
router.get('/recommendations/:distance',
  asyncHandler(async (req, res) => {
    const distance = parseFloat(req.params.distance);
    const requestId = req.headers['x-request-id'] as string;

    if (isNaN(distance) || distance < 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Distance must be a valid non-negative number'
        }
      });
    }

    const distanceKm = distance / 1000;
    const recommendations = emissionsCalculator.getRecommendations(distanceKm);

    // Add detailed metrics for recommended modes
    const detailedRecommendations = recommendations.recommended.map(mode => {
      const metrics = emissionsCalculator.calculateMetrics({ distance, mode });
      return {
        mode,
        ...transportModes[mode],
        metrics
      };
    });

    const response: APIResponse<{
      distance: number;
      distanceKm: number;
      recommendations: typeof recommendations;
      detailedOptions: typeof detailedRecommendations;
    }> = {
      success: true,
      data: {
        distance,
        distanceKm,
        recommendations,
        detailedOptions: detailedRecommendations
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString()
      }
    };

    res.json(response);
  })
);

export default router;