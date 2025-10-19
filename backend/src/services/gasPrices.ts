import logger from '../utils/logger';

/**
 * Regional gas price data (in USD per gallon)
 * Data sources: 
 * - US Energy Information Administration (EIA)
 * - National/Regional averages as of 2024
 * 
 * Prices are intentionally kept as estimates and ranges to account for:
 * - Seasonal variations
 * - Local market conditions
 * - Different fuel grades
 */
interface RegionalGasPrices {
  country: string;
  region?: string;
  pricePerGallon: number; // USD per gallon
  currency: string;
}

// Regional gas price database
// Note: Prices in USD per gallon for consistency
const gasPriceDatabase: RegionalGasPrices[] = [
  // United States - by state/region
  { country: 'US', region: 'California', pricePerGallon: 4.80, currency: 'USD' },
  { country: 'US', region: 'New York', pricePerGallon: 3.65, currency: 'USD' },
  { country: 'US', region: 'Texas', pricePerGallon: 3.10, currency: 'USD' },
  { country: 'US', region: 'Florida', pricePerGallon: 3.35, currency: 'USD' },
  { country: 'US', region: 'Illinois', pricePerGallon: 3.75, currency: 'USD' },
  { country: 'US', region: 'Pennsylvania', pricePerGallon: 3.60, currency: 'USD' },
  { country: 'US', region: 'Ohio', pricePerGallon: 3.40, currency: 'USD' },
  { country: 'US', region: 'Georgia', pricePerGallon: 3.25, currency: 'USD' },
  { country: 'US', region: 'North Carolina', pricePerGallon: 3.30, currency: 'USD' },
  { country: 'US', region: 'Michigan', pricePerGallon: 3.55, currency: 'USD' },
  { country: 'US', region: 'New Jersey', pricePerGallon: 3.45, currency: 'USD' },
  { country: 'US', region: 'Virginia', pricePerGallon: 3.35, currency: 'USD' },
  { country: 'US', region: 'Washington', pricePerGallon: 4.50, currency: 'USD' },
  { country: 'US', region: 'Arizona', pricePerGallon: 3.60, currency: 'USD' },
  { country: 'US', region: 'Massachusetts', pricePerGallon: 3.55, currency: 'USD' },
  { country: 'US', region: 'Tennessee', pricePerGallon: 3.20, currency: 'USD' },
  { country: 'US', region: 'Indiana', pricePerGallon: 3.45, currency: 'USD' },
  { country: 'US', region: 'Missouri', pricePerGallon: 3.15, currency: 'USD' },
  { country: 'US', region: 'Maryland', pricePerGallon: 3.50, currency: 'USD' },
  { country: 'US', region: 'Wisconsin', pricePerGallon: 3.35, currency: 'USD' },
  { country: 'US', region: 'Colorado', pricePerGallon: 3.55, currency: 'USD' },
  { country: 'US', region: 'Minnesota', pricePerGallon: 3.40, currency: 'USD' },
  { country: 'US', pricePerGallon: 3.50, currency: 'USD' }, // US National Average
  
  // Canada
  { country: 'CA', region: 'Ontario', pricePerGallon: 4.20, currency: 'USD' },
  { country: 'CA', region: 'Quebec', pricePerGallon: 4.35, currency: 'USD' },
  { country: 'CA', region: 'British Columbia', pricePerGallon: 4.65, currency: 'USD' },
  { country: 'CA', region: 'Alberta', pricePerGallon: 3.85, currency: 'USD' },
  { country: 'CA', pricePerGallon: 4.25, currency: 'USD' }, // Canada National Average
  
  // United Kingdom (converted from GBP per liter)
  { country: 'GB', pricePerGallon: 6.80, currency: 'USD' },
  
  // European Union countries (converted from EUR per liter)
  { country: 'DE', pricePerGallon: 6.50, currency: 'USD' }, // Germany
  { country: 'FR', pricePerGallon: 6.90, currency: 'USD' }, // France
  { country: 'IT', pricePerGallon: 7.10, currency: 'USD' }, // Italy
  { country: 'ES', pricePerGallon: 6.20, currency: 'USD' }, // Spain
  { country: 'NL', pricePerGallon: 7.50, currency: 'USD' }, // Netherlands
  
  // Other countries
  { country: 'AU', pricePerGallon: 5.20, currency: 'USD' }, // Australia
  { country: 'NZ', pricePerGallon: 5.50, currency: 'USD' }, // New Zealand
  { country: 'MX', pricePerGallon: 3.80, currency: 'USD' }, // Mexico
  { country: 'JP', pricePerGallon: 5.40, currency: 'USD' }, // Japan
  { country: 'KR', pricePerGallon: 5.60, currency: 'USD' }, // South Korea
];

// Default/Global average if no match found
const DEFAULT_GAS_PRICE = 3.80; // USD per gallon - global average

/**
 * Vehicle efficiency ranges (miles per gallon)
 * These represent the spectrum of vehicle fuel efficiency
 */
export const VEHICLE_EFFICIENCY = {
  efficient: 35,    // Efficient cars (hybrids, compact cars)
  average: 25,      // Average sedan/crossover
  inefficient: 18,  // SUVs, trucks, older vehicles
};

class GasPriceService {
  /**
   * Get gas price for a specific location
   * Location can include country and region information
   */
  getGasPriceForLocation(locationContext?: {
    country?: string;
    region?: string;
  }): number {
    if (!locationContext) {
      logger.debug('No location context provided, using default gas price');
      return DEFAULT_GAS_PRICE;
    }

    const { country, region } = locationContext;

    // Try to find exact match with region
    if (country && region) {
      const exactMatch = gasPriceDatabase.find(
        entry => entry.country === country && entry.region === region
      );
      if (exactMatch) {
        logger.debug('Found exact gas price match', { country, region, price: exactMatch.pricePerGallon });
        return exactMatch.pricePerGallon;
      }
    }

    // Try to find country-level match
    if (country) {
      const countryMatch = gasPriceDatabase.find(
        entry => entry.country === country && !entry.region
      );
      if (countryMatch) {
        logger.debug('Found country-level gas price match', { country, price: countryMatch.pricePerGallon });
        return countryMatch.pricePerGallon;
      }
    }

    logger.debug('No gas price match found, using default', { country, region, defaultPrice: DEFAULT_GAS_PRICE });
    return DEFAULT_GAS_PRICE;
  }

  /**
   * Calculate cost per km based on gas price and vehicle efficiency
   */
  calculateCostPerKm(gasPricePerGallon: number, milesPerGallon: number): number {
    // Convert miles to km (1 mile = 1.60934 km)
    const kmPerGallon = milesPerGallon * 1.60934;
    const costPerKm = gasPricePerGallon / kmPerGallon;
    return costPerKm;
  }

  /**
   * Get cost range for driving based on location and various vehicle efficiencies
   */
  getCostRange(locationContext?: {
    country?: string;
    region?: string;
  }): {
    min: number;      // Cost per km for efficient vehicles
    max: number;      // Cost per km for inefficient vehicles
    average: number;  // Cost per km for average vehicles
    gasPricePerGallon: number;
  } {
    const gasPrice = this.getGasPriceForLocation(locationContext);
    
    const minCost = this.calculateCostPerKm(gasPrice, VEHICLE_EFFICIENCY.efficient);
    const maxCost = this.calculateCostPerKm(gasPrice, VEHICLE_EFFICIENCY.inefficient);
    const avgCost = this.calculateCostPerKm(gasPrice, VEHICLE_EFFICIENCY.average);

    logger.debug('Calculated cost range', {
      locationContext,
      gasPrice,
      minCost,
      maxCost,
      avgCost,
      vehicleEfficiency: VEHICLE_EFFICIENCY
    });

    return {
      min: Math.round(minCost * 100) / 100,
      max: Math.round(maxCost * 100) / 100,
      average: Math.round(avgCost * 100) / 100,
      gasPricePerGallon: gasPrice
    };
  }

  /**
   * Parse location context from Mapbox feature context
   * Mapbox provides context array with country and region info
   */
  parseLocationContext(mapboxContext?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>): {
    country?: string;
    region?: string;
  } | undefined {
    if (!mapboxContext || mapboxContext.length === 0) {
      return undefined;
    }

    let country: string | undefined;
    let region: string | undefined;

    for (const item of mapboxContext) {
      // Country context items have id like "country.xxx"
      if (item.id.startsWith('country.')) {
        // Use short_code (e.g., "us", "gb") or parse from id
        country = item.short_code?.toUpperCase().replace('US-', '').replace('GB-', '') || 
                  item.id.split('.')[1]?.substring(0, 2).toUpperCase();
      }
      // Region context items (states, provinces) have id like "region.xxx"
      else if (item.id.startsWith('region.')) {
        region = item.text;
      }
      // In US, places also have format like "us-california" in short_code
      else if (item.short_code?.includes('-')) {
        const parts = item.short_code.split('-');
        if (parts.length === 2) {
          country = parts[0].toUpperCase();
          // Don't override region from explicit region context
          if (!region) {
            region = item.text;
          }
        }
      }
    }

    return country ? { country, region } : undefined;
  }
}

export const gasPriceService = new GasPriceService();
export default gasPriceService;
