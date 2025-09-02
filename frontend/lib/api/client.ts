// API client configuration for transport planner backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: defaultHeaders,
      });

      if (!response.ok) {
        // Handle HTTP errors
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {
            success: false,
            error: {
              code: 'HTTP_ERROR',
              message: `HTTP ${response.status}: ${response.statusText}`,
            },
          };
        }
        return errorData;
      }

      const data: APIResponse<T> = await response.json();
      return data;

    } catch (error) {
      // Handle network errors
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network request failed',
        },
      };
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new APIClient();
export default apiClient;