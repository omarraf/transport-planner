import logger from '../utils/logger';
import { TransportModeId, RouteMetrics, TransportMode, MetricsRequest } from '../types';

// Transport mode definitions with emissions and cost factors
// 
// CARBON EMISSIONS METHODOLOGY:
// Car emissions are calculated using a weighted average from multiple authoritative sources:
// - US EPA (2023): Average passenger vehicle emits 0.404 kg CO2/km
// - UK DEFRA (2023): Average car (petrol/diesel mix) emits 0.171 kg CO2/km  
// - EU EEA (2023): Average new car CO2 emissions ~0.108 kg CO2/km (WLTP)
// - Our estimate uses 0.180 kg CO2/km as a realistic global average accounting for:
//   * Fleet mix of older and newer vehicles
//   * Mix of vehicle sizes (compact cars to SUVs)
//   * Real-world driving conditions vs laboratory tests
//   * Regional variations in fuel efficiency standards
//
// Sources:
// - EPA: https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle
// - DEFRA: UK Government GHG Conversion Factors 2023
// - EEA: European Environment Agency CO2 emissions from passenger transport
//
export const transportModes: Record<TransportModeId, TransportMode> = {
  walking: {
    id: 'walking',
    name: 'Walking',
    mapboxProfile: 'mapbox/walking',
    color: '#22c55e',
    icon: '🚶',
    emissionsFactor: 0, // kg CO2 per km - zero direct emissions
    costFactor: 0, // cost per km
    caloriesFactor: 45 // calories per km
  },
  cycling: {
    id: 'cycling',
    name: 'Cycling',
    mapboxProfile: 'mapbox/cycling',
    color: '#3b82f6',
    icon: '🚴',
    emissionsFactor: 0, // kg CO2 per km - zero direct emissions (lifecycle emissions ~0.021 kg CO2/km from manufacturing)
    costFactor: 0, // zero direct cost
    caloriesFactor: 35 // calories per km
  },
  driving: {
    id: 'driving',
    name: 'Driving',
    mapboxProfile: 'mapbox/driving',
    color: '#ef4444',
    icon: '🚗',
    emissionsFactor: 0.180, // kg CO2 per km - realistic global average for passenger cars
    costFactor: 0.45 // fuel, maintenance, insurance, depreciation per km
  },
  transit: {
    id: 'transit',
    name: 'Public Transit',
    mapboxProfile: 'mapbox/driving', // fallback for routing
    color: '#8b5cf6',
    icon: '🚌',
    emissionsFactor: 0.089, // kg CO2 per km per passenger - average bus/rail mix
    costFactor: 0.15 // average fare per km
  }
};

// Detailed emissions calculation methodology and sources
export const emissionsMethodology = {
  driving: {
    factor: 0.180,
    methodology: 'Weighted average from EPA, DEFRA, and EEA data',
    sources: [
      'US EPA (2023): 0.404 kg CO2/km for average passenger vehicle',
      'UK DEFRA (2023): 0.171 kg CO2/km for average petrol/diesel car',
      'EU EEA (2023): ~0.108 kg CO2/km for new cars (WLTP standard)'
    ],
    factors: [
      'Fleet mix including older vehicles (higher emissions)',
      'Real-world driving vs laboratory conditions',
      'Mix of vehicle types from compact cars to SUVs',
      'Regional fuel efficiency standards'
    ],
    note: 'Actual emissions vary significantly by vehicle age, type, and driving conditions. Electric vehicles produce ~0.04-0.08 kg CO2/km depending on electricity grid mix.'
  },
  transit: {
    factor: 0.089,
    methodology: 'Per-passenger emissions for typical public transport mix',
    sources: [
      'Various transit agency data and government transport statistics',
      'Average occupancy rates for buses, trains, and metro systems'
    ],
    factors: [
      'Vehicle occupancy rates',
      'Mix of bus, rail, and metro transport',
      'Regional energy mix for electric systems'
    ],
    note: 'Includes buses, trains, and metro systems. Varies by occupancy rates and regional energy mix.'
  },
  cycling: {
    factor: 0,
    methodology: 'Zero direct emissions, minimal lifecycle emissions',
    sources: [
      'Lifecycle assessment studies for bicycle manufacturing',
      'Maintenance and infrastructure impact studies'
    ],
    factors: [
      'Manufacturing emissions (spread over bicycle lifetime)',
      'Maintenance and replacement parts',
      'Infrastructure construction and maintenance'
    ],
    note: 'Lifecycle emissions from manufacturing and maintenance are approximately 0.021 kg CO2/km but not included in direct transport emissions.'
  },
  walking: {
    factor: 0,
    methodology: 'Zero emissions',
    sources: [
      'Direct measurement - no fossil fuel combustion',
      'No mechanical systems requiring energy input'
    ],
    factors: [
      'No direct emissions',
      'Minimal infrastructure requirements'
    ],
    note: 'Most sustainable transport option with additional health benefits.'
  }
};

class EmissionsCalculatorService {
  /**
   * Calculate comprehensive route metrics including carbon emissions, cost, and health impact
   */
  calculateMetrics(request: MetricsRequest): RouteMetrics {
    const { distance, mode } = request;
    
    const transportMode = transportModes[mode];
    if (!transportMode) {
      throw new Error(`Unknown transport mode: ${mode}`);
    }

    const distanceKm = distance / 1000; // Convert meters to kilometers
    
    // Calculate carbon emissions
    const carbonEmissions = this.calculateCarbonEmissions(distanceKm, transportMode);
    
    // Calculate estimated cost
    const estimatedCost = this.calculateCost(distanceKm, transportMode);
    
    // Calculate calories for active modes
    const calories = transportMode.caloriesFactor 
      ? Math.round(distanceKm * transportMode.caloriesFactor)
      : undefined;
    
    // Determine environmental rating
    const environmentalRating = this.getEnvironmentalRating(carbonEmissions, distanceKm);
    
    // Generate health impact message
    const healthImpact = this.getHealthImpact(mode, distanceKm, calories);
    
    const metrics: RouteMetrics = {
      carbonEmissions,
      estimatedCost,
      calories,
      healthImpact,
      environmentalRating,
      details: {
        emissionsFactor: transportMode.emissionsFactor,
        distanceKm,
        breakdown: this.getEmissionsBreakdown(mode, distanceKm, carbonEmissions)
      }
    };

    logger.info('Calculated route metrics', {
      mode,
      distance,
      distanceKm,
      carbonEmissions,
      estimatedCost,
      environmentalRating,
      calories
    });

    return metrics;
  }

  /**
   * Calculate carbon emissions for a given distance and transport mode
   */
  private calculateCarbonEmissions(distanceKm: number, transportMode: TransportMode): number {
    const emissions = distanceKm * transportMode.emissionsFactor;
    return Math.round(emissions * 1000) / 1000; // Round to 3 decimal places
  }

  /**
   * Calculate estimated cost for a journey
   */
  private calculateCost(distanceKm: number, transportMode: TransportMode): number {
    const cost = distanceKm * transportMode.costFactor;
    return Math.round(cost * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine environmental rating based on emissions per km
   */
  private getEnvironmentalRating(carbonEmissions: number, distanceKm: number): 'A' | 'B' | 'C' | 'D' | 'E' {
    if (distanceKm === 0) return 'A';
    
    const emissionsPerKm = carbonEmissions / distanceKm;
    
    if (emissionsPerKm === 0) return 'A'; // Walking
    if (emissionsPerKm <= 0.05) return 'A'; // Very low emissions (cycling)
    if (emissionsPerKm <= 0.1) return 'B'; // Low emissions (efficient public transport)
    if (emissionsPerKm <= 0.15) return 'C'; // Medium emissions (bus, train)
    if (emissionsPerKm <= 0.25) return 'D'; // High emissions (average car)
    return 'E'; // Very high emissions (inefficient car, SUV)
  }

  /**
   * Generate health impact message based on transport mode
   */
  private getHealthImpact(mode: TransportModeId, distanceKm: number, calories?: number): string {
    switch (mode) {
      case 'walking':
        if (distanceKm < 1) {
          return `Great choice! You'll burn ~${calories} calories and get fresh air.`;
        } else if (distanceKm < 3) {
          return `Excellent exercise! You'll burn ~${calories} calories and improve cardiovascular health.`;
        } else {
          return `Fantastic workout! You'll burn ~${calories} calories - that's like a gym session.`;
        }
      
      case 'cycling':
        if (distanceKm < 2) {
          return `Good exercise! You'll burn ~${calories} calories and reduce air pollution.`;
        } else if (distanceKm < 10) {
          return `Great workout! You'll burn ~${calories} calories and strengthen your muscles.`;
        } else {
          return `Amazing exercise! You'll burn ~${calories} calories - excellent for fitness.`;
        }
      
      case 'transit':
        return distanceKm < 5 
          ? 'Eco-friendly choice! Consider walking part of the way for added health benefits.'
          : 'Smart sustainable choice! You\'re reducing traffic and emissions.';
      
      case 'driving':
        if (distanceKm < 2) {
          return 'Consider walking or cycling for short distances - better for health and environment.';
        } else if (distanceKm < 5) {
          return 'For regular trips, consider cycling or public transport alternatives.';
        } else {
          return 'For long trips, consider carpooling or public transport when possible.';
        }
      
      default:
        return 'Consider the environmental and health impacts of your transport choice.';
    }
  }

  /**
   * Generate detailed emissions breakdown with methodology
   */
  private getEmissionsBreakdown(mode: TransportModeId, distanceKm: number, totalEmissions: number): string {
    const transportMode = transportModes[mode];
    const methodology = emissionsMethodology[mode];
    
    switch (mode) {
      case 'walking':
        return `Zero direct emissions. Walking is the most sustainable transport option with additional health benefits. ${methodology?.note || ''}`;
      
      case 'cycling':
        return `Zero direct emissions. ${methodology?.note || ''} Cycling produces ${transportMode.emissionsFactor} kg CO2/km in direct emissions.`;
      
      case 'driving':
        return `Vehicle emissions: ${transportMode.emissionsFactor} kg CO2/km (${methodology?.methodology || 'industry average'}). ` +
               `Total: ${totalEmissions.toFixed(3)} kg CO2 for ${distanceKm.toFixed(1)} km. ` +
               `${methodology?.note || ''}`;
      
      case 'transit':
        return `Shared transport emissions: ${transportMode.emissionsFactor} kg CO2/km per passenger. ` +
               `${methodology?.note || ''} Much more efficient than individual car travel.`;
      
      default:
        return `Emissions calculated using factor of ${transportMode.emissionsFactor} kg CO2/km based on ${methodology?.methodology || 'industry standards'}.`;
    }
  }

  /**
   * Compare multiple transport options for the same route
   */
  compareTransportModes(distance: number, modes: TransportModeId[]): Array<RouteMetrics & { mode: TransportModeId }> {
    return modes.map(mode => ({
      mode,
      ...this.calculateMetrics({ distance, mode })
    })).sort((a, b) => a.carbonEmissions - b.carbonEmissions); // Sort by emissions (best first)
  }

  /**
   * Get detailed calculation methodology for a transport mode
   */
  getCalculationMethodology(mode: TransportModeId): {
    emissionsFactor: number;
    methodology: string;
    sources: string[];
    factors: string[];
    note: string;
  } {
    const transportMode = transportModes[mode];
    const methodology = emissionsMethodology[mode];
    
    return {
      emissionsFactor: transportMode.emissionsFactor,
      methodology: methodology?.methodology || 'Standard industry calculations',
      sources: methodology?.sources || [],
      factors: methodology?.factors || [],
      note: methodology?.note || ''
    };
  }

  /**
   * Get recommendations based on distance and context
   */
  getRecommendations(distanceKm: number): {
    recommended: TransportModeId[];
    avoid: TransportModeId[];
    message: string;
  } {
    if (distanceKm < 1) {
      return {
        recommended: ['walking'],
        avoid: ['driving'],
        message: 'For short distances under 1km, walking is fastest and healthiest!'
      };
    } else if (distanceKm < 3) {
      return {
        recommended: ['walking', 'cycling'],
        avoid: ['driving'],
        message: 'Perfect distance for walking or cycling - great for health and environment.'
      };
    } else if (distanceKm < 8) {
      return {
        recommended: ['cycling', 'transit'],
        avoid: [],
        message: 'Cycling or public transport are efficient and sustainable for this distance.'
      };
    } else {
      return {
        recommended: ['transit', 'driving'],
        avoid: [],
        message: 'For longer distances, public transport is more sustainable than driving alone.'
      };
    }
  }
}

// Export singleton instance
export const emissionsCalculator = new EmissionsCalculatorService();
export default emissionsCalculator;