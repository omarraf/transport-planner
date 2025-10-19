// Metrics API service - Environmental impact calculations

import { apiClient, APIResponse } from './client';

export type TransportModeId = 'walking' | 'cycling' | 'driving' | 'transit';

export interface RouteMetrics {
  carbonEmissions: number;   // kg CO2
  estimatedCost: number;     // in currency units (average for backward compatibility)
  costRange?: {              // cost range for driving mode
    min: number;             // minimum cost (efficient vehicles)
    max: number;             // maximum cost (inefficient vehicles)
    average: number;         // average cost
  };
  calories?: number;         // for walking/cycling
  healthImpact?: string;
  environmentalRating: 'A' | 'B' | 'C' | 'D' | 'E';
  details: {
    emissionsFactor: number;
    distanceKm: number;
    breakdown: string;
  };
}

export interface MetricsRequest {
  distance: number;  // in meters
  mode: TransportModeId;
  duration?: number; // in seconds
  locationContext?: {
    country?: string;
    region?: string;
  };
}

export interface TransportMode {
  id: TransportModeId;
  name: string;
  mapboxProfile: string;
  color: string;
  icon: string;
  emissionsFactor: number;
  costFactor: number;
  caloriesFactor?: number;
  emissionsDescription: string;
  costDescription: string;
  healthBenefits?: string;
}

/**
 * Calculate environmental metrics for a route
 * 
 * @param distance - Distance in meters
 * @param mode - Transport mode
 * @param duration - Optional duration in seconds
 * @param locationContext - Optional location context for gas price calculation
 * @returns Promise with environmental metrics
 */
export async function calculateMetrics(
  distance: number,
  mode: TransportModeId,
  duration?: number,
  locationContext?: { country?: string; region?: string }
): Promise<{
  success: boolean;
  metrics?: RouteMetrics;
  error?: string;
}> {
  const request: MetricsRequest = {
    distance,
    mode,
    ...(duration && { duration }),
    ...(locationContext && { locationContext })
  };

  try {
    const response: APIResponse<RouteMetrics> = await apiClient.post('/api/metrics', request);

    if (response.success && response.data) {
      return {
        success: true,
        metrics: response.data
      };
    } else {
      return {
        success: false,
        error: response.error?.message || 'Metrics calculation failed'
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
 * Compare metrics across multiple transport modes
 * 
 * @param distance - Distance in meters
 * @param modes - Array of transport modes to compare
 * @param duration - Optional duration in seconds
 * @param locationContext - Optional location context for gas price calculation
 * @returns Promise with comparison results
 */
export async function compareTransportModes(
  distance: number,
  modes: TransportModeId[],
  duration?: number,
  locationContext?: { country?: string; region?: string }
): Promise<{
  success: boolean;
  comparison?: Array<RouteMetrics & { mode: TransportModeId }>;
  summary?: {
    bestOption: RouteMetrics & { mode: TransportModeId };
    worstOption: RouteMetrics & { mode: TransportModeId };
    carbonSavings: number;
    costSavings: number;
    recommendations: {
      recommended: TransportModeId[];
      avoid: TransportModeId[];
      message: string;
    };
  };
  error?: string;
}> {
  const request = {
    distance,
    modes,
    ...(duration && { duration }),
    ...(locationContext && { locationContext })
  };

  try {
    const response = await apiClient.post<{
      comparison: Array<RouteMetrics & { mode: TransportModeId }>;
      summary: {
        bestOption: RouteMetrics & { mode: TransportModeId };
        worstOption: RouteMetrics & { mode: TransportModeId };
        carbonSavings: number;
        costSavings: number;
        recommendations: {
          recommended: TransportModeId[];
          avoid: TransportModeId[];
          message: string;
        };
      };
    }>('/api/metrics/compare', request);

    if (response.success && response.data) {
      return {
        success: true,
        comparison: response.data.comparison,
        summary: response.data.summary
      };
    } else {
      return {
        success: false,
        error: response.error?.message || 'Metrics comparison failed'
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
 * Get available transport modes with their properties
 */
export async function getTransportModes(): Promise<{
  success: boolean;
  modes: TransportMode[];
  error?: string;
}> {
  try {
    const response: APIResponse<TransportMode[]> = await apiClient.get('/api/metrics/transport-modes');

    if (response.success && response.data) {
      return {
        success: true,
        modes: response.data
      };
    } else {
      return {
        success: false,
        modes: [],
        error: response.error?.message || 'Failed to fetch transport modes'
      };
    }

  } catch (error) {
    return {
      success: false,
      modes: [],
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

/**
 * Get transport recommendations for a specific distance
 * 
 * @param distance - Distance in meters
 * @returns Promise with recommendations
 */
export async function getRecommendations(distance: number): Promise<{
  success: boolean;
  recommendations?: {
    distance: number;
    distanceKm: number;
    recommendations: {
      recommended: TransportModeId[];
      avoid: TransportModeId[];
      message: string;
    };
    detailedOptions: Array<{
      mode: TransportModeId;
      metrics: RouteMetrics;
    }>;
  };
  error?: string;
}> {
  try {
    const response = await apiClient.get<{
      distance: number;
      distanceKm: number;
      recommendations: {
        recommended: TransportModeId[];
        avoid: TransportModeId[];
        message: string;
      };
      detailedOptions: Array<{
        mode: TransportModeId;
        metrics: RouteMetrics;
      }>;
    }>(`/api/metrics/recommendations/${distance}`);

    if (response.success && response.data) {
      return {
        success: true,
        recommendations: response.data
      };
    } else {
      return {
        success: false,
        error: response.error?.message || 'Failed to get recommendations'
      };
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}