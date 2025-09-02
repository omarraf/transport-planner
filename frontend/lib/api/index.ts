// Main API exports for the transport planner frontend

export * from './client';
export * from './geocoding';
export * from './routing';
export * from './metrics';

// Re-export commonly used functions with cleaner names
export { 
  searchLocations as geocode
} from './geocoding';
export { 
  calculateRoute as getRoute 
} from './routing';
export { 
  calculateMetrics as getMetrics 
} from './metrics';