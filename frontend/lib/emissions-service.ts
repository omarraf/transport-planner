interface EmissionsMethodology {
  emissionsFactor: number;
  methodology: string;
  sources: string[];
  factors: string[];
  note: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
  meta: {
    requestId: string;
    timestamp: string;
  };
}

class EmissionsService {
  private baseUrl: string;

  constructor() {
    // In a real app, this would come from environment variables
    // For now, we'll assume the API is running on a standard port
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }

  async getMethodology(mode: string): Promise<EmissionsMethodology | null> {
    try {
      const response = await fetch(`${this.baseUrl}/metrics/methodology/${mode}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': crypto.randomUUID?.() || Math.random().toString(36)
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch methodology for ${mode}:`, response.status);
        return null;
      }

      const result: ApiResponse<EmissionsMethodology> = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error(`API error for ${mode}:`, result.error);
        return null;
      }
    } catch (error) {
      console.error(`Network error fetching methodology for ${mode}:`, error);
      return null;
    }
  }

  // Fallback data in case the API is not available
  getFallbackMethodology(mode: string): EmissionsMethodology {
    const fallbacks: Record<string, EmissionsMethodology> = {
      driving: {
        emissionsFactor: 0.180,
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
        note: 'Actual emissions vary significantly by vehicle age, type, and driving conditions.'
      },
      cycling: {
        emissionsFactor: 0,
        methodology: 'Zero direct emissions, minimal lifecycle emissions',
        sources: ['Lifecycle assessment studies for bicycle manufacturing'],
        factors: ['Manufacturing emissions (spread over bicycle lifetime)', 'Maintenance and replacement parts'],
        note: 'Lifecycle emissions from manufacturing are approximately 0.021 kg CO2/km but not included in direct transport emissions.'
      },
      walking: {
        emissionsFactor: 0,
        methodology: 'Zero emissions',
        sources: ['Direct measurement - no fossil fuel combustion'],
        factors: ['No direct emissions', 'Minimal infrastructure requirements'],
        note: 'Most sustainable transport option with additional health benefits.'
      },
      transit: {
        emissionsFactor: 0.089,
        methodology: 'Per-passenger emissions for typical public transport mix',
        sources: ['Various transit agency data and government transport statistics'],
        factors: ['Vehicle occupancy rates', 'Mix of bus, rail, and metro transport'],
        note: 'Includes buses, trains, and metro systems. Varies by occupancy rates and regional energy mix.'
      }
    };

    return fallbacks[mode] || fallbacks.driving;
  }
}

export const emissionsService = new EmissionsService();
export type { EmissionsMethodology };