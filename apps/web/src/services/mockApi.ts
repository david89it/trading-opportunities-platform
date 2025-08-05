import { OpportunitiesResponse, Opportunity } from '@alpha-scanner/shared';

// Mock data that matches the new API structure
const mockOpportunityData: Opportunity[] = [
  {
    id: "fd0e6c4e-1b53-49c5-8b1b-c1abfa97e5a7",
    symbol: "SQ",
    timestamp: "2025-08-04T12:15:07.046838Z",
    signal_score: 9.9,
    scores: {
      price: 9.8,
      volume: 10.0,
      volatility: 10.0,
      overall: 9.9
    },
    setup: {
      entry: 78.96,
      stop: 73.03,
      target1: 101.46,
      target2: 112.71,
      position_size_usd: 631.68,
      position_size_shares: 8,
      rr_ratio: 3.79
    },
    risk: {
      p_target: 0.746,
      net_expected_r: 2.475,
      costs_r: 0.102,
      slippage_bps: 14.1
    },
    features: {
      rvol: 2.39,
      atr_pct: 5.7,
      vwap_distance: 1.236,
      ema_20_slope: -0.078,
      volume_20d_avg: 49814512,
      regime: "trending",
      earnings_days: 44
    },
    guardrail_status: "review",
    guardrail_reason: "High volatility",
    version: "1.0.0"
  },
  {
    id: "a1b2c3d4-5e6f-7890-abcd-ef1234567890",
    symbol: "AAPL",
    timestamp: "2025-08-04T12:10:00.000Z",
    signal_score: 8.5,
    scores: {
      price: 8.2,
      volume: 8.8,
      volatility: 8.5,
      overall: 8.5
    },
    setup: {
      entry: 185.50,
      stop: 180.00,
      target1: 195.00,
      target2: 205.00,
      position_size_usd: 1100.00,
      position_size_shares: 6,
      rr_ratio: 1.73
    },
    risk: {
      p_target: 0.65,
      net_expected_r: 0.45,
      costs_r: 0.08,
      slippage_bps: 12.0
    },
    features: {
      rvol: 1.8,
      atr_pct: 3.2,
      vwap_distance: 0.8,
      ema_20_slope: 0.045,
      volume_20d_avg: 58000000,
      regime: "consolidating",
      earnings_days: 21
    },
    guardrail_status: "approved",
    version: "1.0.0"
  },
  {
    id: "xyz789-abc123-def456-ghi789",
    symbol: "TSLA",
    timestamp: "2025-08-04T12:05:00.000Z",
    signal_score: 7.2,
    scores: {
      price: 7.0,
      volume: 7.5,
      volatility: 7.1,
      overall: 7.2
    },
    setup: {
      entry: 245.00,
      stop: 235.00,
      target1: 265.00,
      target2: 280.00,
      position_size_usd: 800.00,
      position_size_shares: 3,
      rr_ratio: 2.0
    },
    risk: {
      p_target: 0.55,
      net_expected_r: 0.25,
      costs_r: 0.12,
      slippage_bps: 18.0
    },
    features: {
      rvol: 2.1,
      atr_pct: 4.8,
      vwap_distance: -0.5,
      ema_20_slope: -0.025,
      volume_20d_avg: 92000000,
      regime: "volatile",
      earnings_days: 35
    },
    guardrail_status: "blocked",
    guardrail_reason: "Earnings approaching",
    version: "1.0.0"
  }
];

export const mockApi = {
  getOpportunities: async (params?: {
    limit?: number;
    offset?: number;
    min_score?: number;
    status?: string;
  }): Promise<OpportunitiesResponse> => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    let filteredData = [...mockOpportunityData];
    
    // Apply filters
    if (params?.min_score) {
      filteredData = filteredData.filter(opp => opp.signal_score >= params.min_score!);
    }
    
    if (params?.status) {
      filteredData = filteredData.filter(opp => opp.guardrail_status === params.status);
    }
    
    // Apply pagination
    const offset = params?.offset || 0;
    const limit = params?.limit || 50;
    const paginatedData = filteredData.slice(offset, offset + limit);
    
    return {
      opportunities: paginatedData,
      total: filteredData.length,
      limit,
      offset,
      timestamp: new Date().toISOString()
    };
  },
  
  getOpportunity: async (symbol: string): Promise<Opportunity> => {
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
    
    const opportunity = mockOpportunityData.find(opp => opp.symbol === symbol);
    if (!opportunity) {
      throw new Error(`Opportunity not found for symbol: ${symbol}`);
    }
    
    return opportunity;
  },
  
  scanPreview: async (params?: {
    limit?: number;
    min_score?: number;
  }): Promise<OpportunitiesResponse> => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate longer scan time
    
    let filteredData = [...mockOpportunityData];
    
    if (params?.min_score) {
      filteredData = filteredData.filter(opp => opp.signal_score >= params.min_score!);
    }
    
    const limit = params?.limit || 10;
    const paginatedData = filteredData.slice(0, limit);
    
    return {
      opportunities: paginatedData,
      total: filteredData.length,
      limit,
      offset: 0,
      timestamp: new Date().toISOString()
    };
  },
  
  getHealth: async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "healthy",
      timestamp: new Date().toISOString()
    };
  }
};

export default mockApi;