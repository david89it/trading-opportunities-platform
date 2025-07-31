/**
 * Risk Management API Service
 * 
 * API service functions for Monte Carlo simulations and risk analytics
 */

import { MonteCarloRequest, MonteCarloResponse } from '../types/risk';

// API Configuration
const API_BASE_URL = '/api/v1/risk';

// Generic API Error Class
export class RiskApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RiskApiError';
  }
}

// Generic API Request Function
async function riskApiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch {
        errorDetails = { message: 'Unknown error' };
      }
      
      throw new RiskApiError(
        response.status,
        response.statusText,
        errorDetails.message || `API request failed: ${response.status} ${response.statusText}`,
        errorDetails.details
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof RiskApiError) {
      throw error;
    }
    
    // Network or parsing errors
    throw new RiskApiError(
      0,
      'Network Error',
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

/**
 * Run Monte Carlo simulation
 */
export async function runMonteCarloSimulation(
  parameters: MonteCarloRequest
): Promise<MonteCarloResponse> {
  return riskApiRequest<MonteCarloResponse>('/montecarlo', {
    method: 'POST',
    body: JSON.stringify(parameters),
  });
}

/**
 * Get example Monte Carlo parameters
 */
export async function getMonteCarloExample(): Promise<{
  example_request: MonteCarloRequest;
  description: string;
  parameter_explanations: Record<string, string>;
}> {
  return riskApiRequest('/montecarlo/example');
}

/**
 * Check risk module health
 */
export async function checkRiskHealth(): Promise<{
  status: string;
  module: string;
  numpy_version: string;
  capabilities: string[];
  timestamp: string;
}> {
  return riskApiRequest('/health');
}

// React Query Key Factory for Risk APIs
export const riskQueryKeys = {
  health: ['risk', 'health'] as const,
  monteCarloExample: ['risk', 'montecarlo', 'example'] as const,
  monteCarloSimulation: (params: MonteCarloRequest) => ['risk', 'montecarlo', params] as const,
};

// React Query Options for Risk APIs
export const riskQueryOptions = {
  health: () => ({
    queryKey: riskQueryKeys.health,
    queryFn: checkRiskHealth,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  }),
  
  monteCarloExample: () => ({
    queryKey: riskQueryKeys.monteCarloExample,
    queryFn: getMonteCarloExample,
    staleTime: 30 * 60 * 1000, // 30 minutes - examples don't change often
  }),
  
  monteCarloSimulation: (params: MonteCarloRequest) => ({
    queryKey: riskQueryKeys.monteCarloSimulation(params),
    queryFn: () => runMonteCarloSimulation(params),
    staleTime: 10 * 60 * 1000, // 10 minutes - simulations are expensive
    enabled: false, // Only run when explicitly triggered
  }),
};

/**
 * Utility function to handle API errors in components
 */
export function handleRiskApiError(error: unknown): string {
  if (error instanceof RiskApiError) {
    if (error.status === 400) {
      return `Invalid parameters: ${error.message}`;
    } else if (error.status === 422) {
      return `Validation error: ${error.message}`;
    } else if (error.status === 500) {
      return `Simulation error: ${error.message}`;
    } else if (error.status === 0) {
      return 'Network error: Please check your connection and try again';
    }
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

export default {
  runMonteCarloSimulation,
  getMonteCarloExample,
  checkRiskHealth,
  riskQueryKeys,
  riskQueryOptions,
  handleRiskApiError,
};