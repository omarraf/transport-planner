// Routing API service - Route calculation functionality

import { apiClient, APIResponse } from './client';
import { Location } from './geocoding';

export interface RouteResult {
  distance: number;          // meters
  duration: number;          // seconds
  coordinates: [number, number][];
  geometry?: string;         // encoded polyline or GeoJSON
  instructions?: string[];   // turn-by-turn directions
}

export interface DirectionsRequest {
  start: [number, number];
  end: [number, number];
  profile: string;
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'geojson' | 'polyline' | 'polyline6';
}

export type TransportProfile = 
  | 'mapbox/walking'
  | 'mapbox/cycling'
  | 'mapbox/driving'
  | 'mapbox/driving-traffic';

/**
 * Calculate route between two locations
 * 
 * @param startLocation - Starting location
 * @param endLocation - Ending location  
 * @param profile - Transport mode profile
 * @param options - Optional routing parameters
 * @returns Promise with route result
 */
export async function calculateRoute(
  startLocation: Location,
  endLocation: Location,
  profile: TransportProfile,
  options: Omit<DirectionsRequest, 'start' | 'end' | 'profile'> = {}
): Promise<{
  success: boolean;
  route?: RouteResult;
  error?: string;
  cached?: boolean;
}> {
  const request: DirectionsRequest = {
    start: [startLocation.lng, startLocation.lat],
    end: [endLocation.lng, endLocation.lat],
    profile,
    alternatives: false,
    steps: true,
    geometries: 'geojson',
    ...options
  };

  try {
    const response: APIResponse<RouteResult> = await apiClient.post('/api/directions', request);

    if (response.success && response.data) {
      return {
        success: true,
        route: response.data,
        cached: response.meta?.cached
      };
    } else {
      return {
        success: false,
        error: response.error?.message || 'Route calculation failed'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Calculate routes for multiple transport modes
 * 
 * @param startLocation - Starting location
 * @param endLocation - Ending location
 * @param profiles - Array of transport profiles to test
 * @returns Promise with results for all profiles
 */
export async function calculateMultipleRoutes(
  startLocation: Location,
  endLocation: Location,
  profiles: TransportProfile[]
): Promise<{
  success: boolean;
  routes: Array<{
    profile: TransportProfile;
    success: boolean;
    data?: RouteResult;
    error?: string;
  }>;
  error?: string;
}> {
  const request = {
    start: [startLocation.lng, startLocation.lat],
    end: [endLocation.lng, endLocation.lat],
    profiles
  };

  try {
    const response = await apiClient.post<{
      routes: Array<{
        profile: TransportProfile;
        success: boolean;
        data?: RouteResult;
        error?: string;
      }>;
    }>('/api/directions/batch', request);

    if (response.success && response.data) {
      return {
        success: true,
        routes: response.data.routes
      };
    } else {
      return {
        success: false,
        routes: [],
        error: response.error?.message || 'Batch route calculation failed'
      };
    }

  } catch (error) {
    return {
      success: false,
      routes: [],
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Get available routing profiles
 */
export async function getRoutingProfiles(): Promise<{
  success: boolean;
  profiles: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
  }>;
  error?: string;
}> {
  try {
    const response = await apiClient.get<Array<{
      id: string;
      name: string;
      description: string;
      icon: string;
      color: string;
    }>>('/api/directions/profiles');

    if (response.success && response.data) {
      return {
        success: true,
        profiles: response.data
      };
    } else {
      return {
        success: false,
        profiles: [],
        error: response.error?.message || 'Failed to fetch routing profiles'
      };
    }

  } catch (error) {
    return {
      success: false,
      profiles: [],
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}