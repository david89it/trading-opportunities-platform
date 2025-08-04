import { OpportunitiesResponse, Opportunity } from '@alpha-scanner/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = {
  getOpportunities: async (): Promise<OpportunitiesResponse> => {
    const response = await fetch(`${API_BASE_URL}/opportunities`);
    if (!response.ok) {
      throw new Error('Failed to fetch opportunities');
    }
    return response.json();
  },
  getOpportunity: async (symbol: string): Promise<Opportunity> => {
    const response = await fetch(`${API_BASE_URL}/opportunities/${symbol}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch opportunity for ${symbol}`);
    }
    return response.json();
  },
  getHealth: async (): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Failed to fetch health status');
    }
    return response.json();
  },
};

// Compatibility exports for existing components
export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  return api.getOpportunities();
}

export async function fetchOpportunityBySymbol(symbol: string): Promise<Opportunity> {
  return api.getOpportunity(symbol);
}

export default api;