import { OpportunitiesResponse, Opportunity } from '@alpha-scanner/shared';
import { mockApi } from './mockApi';
import { getAuthHeader } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || false; // Use live API by default

const api = {
  getOpportunities: async (params?: {
    limit?: number;
    offset?: number;
    min_score?: number;
    status?: string;
  }): Promise<OpportunitiesResponse> => {
    if (USE_MOCK_API) {
      return mockApi.getOpportunities(params);
    }
    
    const url = new URL(`${API_BASE_URL}/opportunities`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        ...(await getAuthHeader()),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch opportunities');
    }
    return response.json();
  },
  
  getOpportunity: async (symbol: string): Promise<Opportunity> => {
    if (USE_MOCK_API) {
      return mockApi.getOpportunity(symbol);
    }
    
    const response = await fetch(`${API_BASE_URL}/opportunities/${symbol}`, {
      headers: {
        ...(await getAuthHeader()),
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch opportunity for ${symbol}`);
    }
    return response.json();
  },
  
  scanPreview: async (params?: {
    limit?: number;
    min_score?: number;
  }): Promise<OpportunitiesResponse> => {
    if (USE_MOCK_API) {
      return mockApi.scanPreview(params);
    }
    
    const url = new URL(`${API_BASE_URL}/scan/preview`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...(await getAuthHeader()),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to run scan preview');
    }
    return response.json();
  },
  
  getHealth: async (): Promise<any> => {
    if (USE_MOCK_API) {
      return mockApi.getHealth();
    }
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        ...(await getAuthHeader()),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch health status');
    }
    return response.json();
  },

  // Persistence endpoints (Task 8 MVP)
  persistOpportunities: async (params?: { limit?: number; min_score?: number; name?: string }): Promise<{ status: string; count: number; name?: string }> => {
    const url = new URL(`${API_BASE_URL}/opportunities/persist`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, value.toString())
      })
    }
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...(await getAuthHeader()),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to persist opportunities')
    }
    return response.json()
  },

  getRecentOpportunities: async (params?: { limit?: number; offset?: number }): Promise<OpportunitiesResponse> => {
    const url = new URL(`${API_BASE_URL}/opportunities/recent`, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.append(key, value.toString())
      })
    }
    const response = await fetch(url.toString(), {
      headers: {
        ...(await getAuthHeader()),
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch recent opportunities')
    }
    return response.json()
  },

  getLastSavedListName: async (): Promise<{ name?: string | null }> => {
    const response = await fetch(`${API_BASE_URL}/opportunities/last-list`, {
      headers: {
        ...(await getAuthHeader()),
      },
    })
    if (!response.ok) throw new Error('Failed to fetch last saved list name')
    return response.json()
  },
};

// Compatibility exports for existing components
export async function fetchOpportunities(params?: { limit?: number; offset?: number; min_score?: number; status?: string }): Promise<OpportunitiesResponse> {
  return api.getOpportunities(params);
}

export async function fetchOpportunityBySymbol(symbol: string): Promise<Opportunity> {
  return api.getOpportunity(symbol);
}

export default api;