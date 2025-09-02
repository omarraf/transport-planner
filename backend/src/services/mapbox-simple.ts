import config from '../utils/config';
import logger from '../utils/logger';
import { createError } from '../middleware/errorHandler';
import {
  GeocodingRequest,
  DirectionsRequest,
  Location,
  RouteResult
} from '../types';
import {
  geocodingCacheService,
  directionsCacheService,
  generateGeocodingCacheKey,
  generateDirectionsCacheKey
} from './cache';

class MapboxService {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor() {
    this.baseUrl = config.mapbox.baseUrl;
    this.accessToken = config.mapbox.accessToken;

    if (!this.accessToken || this.accessToken === 'INSERT_YOUR_MAPBOX_TOKEN_HERE') {
      logger.warn('Mapbox access token not configured properly');
    }
  }

  async geocode(request: GeocodingRequest): Promise<Location[]> {
    const { query, limit = 5, proximity, bbox, types } = request;
    
    const cacheKey = generateGeocodingCacheKey(query, { limit, proximity, bbox, types });
    const cachedResult = geocodingCacheService.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached geocoding result', { query, cacheKey });
      return cachedResult;
    }

    try {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        limit: limit.toString(),
        ...(proximity && { proximity: proximity.join(',') }),
        ...(bbox && { bbox: bbox.join(',') }),
        ...(types && { types: types.join(',') })
      });

      const url = `${this.baseUrl}/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
      
      logger.info('Making Mapbox geocoding request', { 
        query, 
        url: url.replace(this.accessToken, 'REDACTED'),
        limit,
        proximity,
        bbox,
        types
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Mapbox geocoding API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          query
        });

        if (response.status === 401) {
          throw createError('Invalid Mapbox access token', 401, 'MAPBOX_AUTH_ERROR');
        } else if (response.status === 429) {
          throw createError('Mapbox API rate limit exceeded', 429, 'MAPBOX_RATE_LIMIT');
        } else {
          throw createError(`Mapbox geocoding failed: ${response.statusText}`, response.status, 'MAPBOX_API_ERROR');
        }
      }

      const data = await response.json() as any;
      
      const locations: Location[] = data.features?.map((feature: any) => ({
        lat: feature.center[1],
        lng: feature.center[0],
        name: feature.place_name,
        place_id: feature.id
      })) || [];

      geocodingCacheService.set(cacheKey, locations);

      logger.info('Mapbox geocoding successful', { 
        query, 
        resultsCount: locations.length,
        cached: true
      });

      return locations;

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Mapbox geocoding service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query
      });

      throw createError('Geocoding service temporarily unavailable', 503, 'GEOCODING_SERVICE_ERROR');
    }
  }

  async getDirections(request: DirectionsRequest): Promise<RouteResult> {
    const { start, end, profile, alternatives = false, steps = true, geometries = 'geojson' } = request;
    
    const cacheKey = generateDirectionsCacheKey(start, end, profile);
    const cachedResult = directionsCacheService.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached directions result', { start, end, profile, cacheKey });
      return cachedResult;
    }

    try {
      const coordinatesStr = `${start.join(',')};${end.join(',')}`;
      
      const params = new URLSearchParams({
        access_token: this.accessToken,
        alternatives: alternatives.toString(),
        steps: steps.toString(),
        geometries,
        overview: 'full'
      });

      const url = `${this.baseUrl}/directions/v5/${profile}/${coordinatesStr}?${params}`;
      
      logger.info('Making Mapbox directions request', { 
        start,
        end,
        profile,
        url: url.replace(this.accessToken, 'REDACTED'),
        alternatives,
        steps,
        geometries
      });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Mapbox directions API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          start,
          end,
          profile
        });

        if (response.status === 401) {
          throw createError('Invalid Mapbox access token', 401, 'MAPBOX_AUTH_ERROR');
        } else if (response.status === 422) {
          throw createError('Invalid coordinates or unreachable destination', 422, 'MAPBOX_INVALID_REQUEST');
        } else if (response.status === 429) {
          throw createError('Mapbox API rate limit exceeded', 429, 'MAPBOX_RATE_LIMIT');
        } else {
          throw createError(`Mapbox directions failed: ${response.statusText}`, response.status, 'MAPBOX_API_ERROR');
        }
      }

      const data = await response.json() as any;
      
      if (!data.routes || data.routes.length === 0) {
        throw createError('No route found between the specified locations', 404, 'NO_ROUTE_FOUND');
      }

      const route = data.routes[0];
      
      // Simple coordinate extraction for GeoJSON
      let routeCoordinates: [number, number][] = [];
      if (geometries === 'geojson' && route.geometry) {
        if (typeof route.geometry === 'string') {
          try {
            const parsed = JSON.parse(route.geometry);
            routeCoordinates = parsed.coordinates || [];
          } catch {
            routeCoordinates = [];
          }
        } else if (route.geometry.coordinates) {
          routeCoordinates = route.geometry.coordinates;
        }
      }

      const instructions = steps && route.legs?.[0]?.steps 
        ? route.legs[0].steps.map((step: any) => step.instruction || step.maneuver?.instruction)
        : undefined;

      const result: RouteResult = {
        distance: route.distance || 0,
        duration: route.duration || 0,
        coordinates: routeCoordinates,
        geometry: typeof route.geometry === 'string' ? route.geometry : JSON.stringify(route.geometry),
        instructions: instructions?.filter(Boolean)
      };

      directionsCacheService.set(cacheKey, result);

      logger.info('Mapbox directions successful', { 
        start,
        end,
        profile,
        distance: route.distance,
        duration: route.duration,
        cached: true
      });

      return result;

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Mapbox directions service error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        start,
        end,
        profile
      });

      throw createError('Directions service temporarily unavailable', 503, 'DIRECTIONS_SERVICE_ERROR');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.geocode({ query: 'London', limit: 1 });
      return testResult.length > 0;
    } catch (error) {
      logger.error('Mapbox connection test failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const mapboxService = new MapboxService();
export default mapboxService;