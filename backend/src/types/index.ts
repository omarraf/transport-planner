export interface Location {
  lat: number;
  lng: number;
  name: string;
  place_id?: string;
}

export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  place_name: string;
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: {
    category?: string;
    landmark?: boolean;
    address?: string;
  };
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export interface MapboxGeocodingResponse {
  type: string;
  query: string[];
  features: MapboxFeature[];
  attribution: string;
}

export interface RouteResult {
  distance: number;          // meters
  duration: number;          // seconds
  coordinates: [number, number][];
  geometry?: string;         // encoded polyline
  instructions?: string[];   // turn-by-turn directions
}

export interface MapboxRoute {
  distance: number;
  duration: number;
  geometry: string;
  legs: Array<{
    distance: number;
    duration: number;
    steps: Array<{
      distance: number;
      duration: number;
      geometry: string;
      name: string;
      instruction: string;
    }>;
  }>;
}

export interface MapboxDirectionsResponse {
  routes: MapboxRoute[];
  waypoints: Array<{
    location: [number, number];
    name: string;
  }>;
  code: string;
  uuid?: string;
}

export type TransportModeId = 'walking' | 'cycling' | 'driving' | 'transit';

export interface TransportMode {
  id: TransportModeId;
  name: string;
  mapboxProfile: string;
  color: string;
  icon: string;
  emissionsFactor: number;   // kg CO2 per km
  costFactor: number;        // cost per km
  caloriesFactor?: number;   // calories per km (for active modes)
}

export interface RouteMetrics {
  carbonEmissions: number;   // kg CO2
  estimatedCost: number;     // in currency units
  calories?: number;         // for walking/cycling
  healthImpact?: string;
  environmentalRating: 'A' | 'B' | 'C' | 'D' | 'E';
  details: {
    emissionsFactor: number;
    distanceKm: number;
    breakdown: string;
  };
}

export interface GeocodingRequest {
  query: string;
  limit?: number;
  proximity?: [number, number];
  bbox?: [number, number, number, number];
  types?: string[];
}

export interface DirectionsRequest {
  start: [number, number];
  end: [number, number];
  profile: string;
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'geojson' | 'polyline' | 'polyline6';
}

export interface MetricsRequest {
  distance: number;  // in meters
  mode: TransportModeId;
  duration?: number; // in seconds
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    cached?: boolean;
  };
}

export interface CacheConfig {
  ttl: number;
  enabled: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
}