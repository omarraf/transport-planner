// Geocoding API service - Location search functionality

import { apiClient, APIResponse } from './client';

export interface Location {
  lat: number;
  lng: number;
  name: string;
  place_id?: string;
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export interface GeocodingRequest {
  query: string;
  limit?: number;
  proximity?: [number, number];
  bbox?: [number, number, number, number];
  types?: string[];
}

/**
 * Search for locations using the backend geocoding API
 * 
 * @param query - Search query (e.g., "London", "Central Park")
 * @param options - Optional search parameters
 * @returns Promise with array of location results
 */
export async function searchLocations(
  query: string,
  options: Omit<GeocodingRequest, 'query'> = {}
): Promise<{
  success: boolean;
  locations: Location[];
  error?: string;
  cached?: boolean;
}> {
  if (!query.trim()) {
    return {
      success: false,
      locations: [],
      error: 'Search query cannot be empty'
    };
  }

  const request: GeocodingRequest = {
    query: query.trim(),
    limit: 5,
    ...options
  };

  try {
    const response: APIResponse<Location[]> = await apiClient.post('/api/geocode', request);

    if (response.success && response.data) {
      return {
        success: true,
        locations: response.data,
        cached: response.meta?.cached
      };
    } else {
      return {
        success: false,
        locations: [],
        error: response.error?.message || 'Location search failed'
      };
    }

  } catch (error) {
    return {
      success: false,
      locations: [],
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Test the geocoding service with a simple query
 */
export async function testGeocodingService(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await apiClient.get('/api/geocode/test');
    
    if (response.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: response.error?.message || 'Geocoding service test failed'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Service test failed'
    };
  }
}