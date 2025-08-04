# Polygon.io Market Data API Reference

This document contains endpoint details, parameters, response schemas, and implementation notes for Polygon.io market data integration.

## Authentication & Setup

```bash
# Environment Variables
POLYGON_API_KEY=your_api_key_here
USE_POLYGON_LIVE=false  # Set to true for live data
```

### Rate Limits
- **Free Tier**: 5 requests/minute
- **Basic Tier**: 100 requests/minute  
- **Starter Tier**: 500 requests/minute
- **Developer Tier**: 1000 requests/minute

## Core Endpoints

### 1. Full Market Snapshot

**Endpoint**: `GET /v2/snapshot/locale/us/markets/stocks/tickers`

**URL**: https://polygon.io/docs/rest/stocks/snapshots/full-market-snapshot

**Description**: Get current market data for all US stock tickers

**Parameters**:
```typescript
interface FullMarketSnapshotParams {
  tickers?: string;           // Comma-separated list (optional filter)
  include_otc?: boolean;      // Include OTC stocks (default: false)
  apikey: string;            // Required API key
}
```

**Response Schema**:
```typescript
interface FullMarketSnapshotResponse {
  status: string;
  request_id?: string;
  count: number;
  results: TickerSnapshot[];
}

interface TickerSnapshot {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  updated: number;           // Unix timestamp
  timeframe: string;
  market_status: 'open' | 'closed' | 'early_hours' | 'late_hours';
  fmv?: number;             // Fair market value
  day: {
    c: number;              // Close price
    h: number;              // High price
    l: number;              // Low price  
    o: number;              // Open price
    v: number;              // Volume
    vw: number;             // Volume weighted average price
  };
  lastQuote: {
    a: number;              // Ask price
    b: number;              // Bid price
    c: number[];            // Conditions
    s: number;              // Ask size
    S: number;              // Bid size
    t: number;              // Timestamp
    x: number;              // Ask exchange
    X: number;              // Bid exchange
  };
  lastTrade: {
    c: number[];            // Conditions
    i: string;              // Trade ID
    p: number;              // Price
    s: number;              // Size
    t: number;              // Timestamp
    x: number;              // Exchange
  };
  prevDay: {
    c: number;              // Previous close
    h: number;              // Previous high
    l: number;              // Previous low
    o: number;              // Previous open
    v: number;              // Previous volume
    vw: number;             // Previous VWAP
  };
}
```

**Implementation**:
```typescript
export async function getFullMarketSnapshot(): Promise<FullMarketSnapshotResponse> {
  const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers`;
  const params = new URLSearchParams({
    apikey: POLYGON_API_KEY,
    include_otc: 'false',
  });
  
  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Polygon API error: ${response.status}`);
  }
  
  return response.json();
}
```

### 2. Single Ticker Snapshot

**Endpoint**: `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}`

**URL**: https://polygon.io/docs/rest/stocks/snapshots/single-ticker-snapshot

**Description**: Get current market data for a specific ticker

**Parameters**:
```typescript
interface SingleTickerParams {
  ticker: string;            // Stock symbol (e.g., 'AAPL')
  apikey: string;           // Required API key
}
```

**Response Schema**:
```typescript
interface SingleTickerResponse {
  status: string;
  request_id?: string;
  results: TickerSnapshot;   // Same structure as above
}
```

**Implementation**:
```typescript
export async function getSingleTickerSnapshot(ticker: string): Promise<SingleTickerResponse> {
  const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker.toUpperCase()}`;
  const params = new URLSearchParams({ apikey: POLYGON_API_KEY });
  
  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${ticker}: ${response.status}`);
  }
  
  return response.json();
}
```

### 3. Aggregates (Custom Bars)

**Endpoint**: `GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}`

**URL**: https://polygon.io/docs/rest/stocks/aggregates/custom-bars

**Description**: Get historical aggregate bars for a ticker

**Parameters**:
```typescript
interface AggregatesParams {
  ticker: string;            // Stock symbol
  multiplier: number;        // Size of timespan multiplier (e.g., 1)
  timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  from: string;             // Start date (YYYY-MM-DD)
  to: string;               // End date (YYYY-MM-DD)
  adjusted?: boolean;        // Adjust for splits (default: true)
  sort?: 'asc' | 'desc';    // Sort order (default: asc)
  limit?: number;           // Max results (default: 5000)
  apikey: string;
}
```

**Response Schema**:
```typescript
interface AggregatesResponse {
  status: string;
  request_id?: string;
  ticker: string;
  queryCount: number;
  resultsCount: number;
  adjusted: boolean;
  results: AggregateBar[];
  next_url?: string;        // Pagination
}

interface AggregateBar {
  c: number;                // Close price
  h: number;                // High price
  l: number;                // Low price
  n: number;                // Number of transactions
  o: number;                // Open price
  t: number;                // Unix timestamp
  v: number;                // Volume
  vw: number;               // Volume weighted average price
}
```

**Implementation**:
```typescript
export async function getAggregates(
  ticker: string,
  multiplier: number,
  timespan: string,
  from: string,
  to: string
): Promise<AggregatesResponse> {
  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`;
  const params = new URLSearchParams({
    adjusted: 'true',
    sort: 'asc',
    limit: '5000',
    apikey: POLYGON_API_KEY,
  });
  
  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch aggregates for ${ticker}: ${response.status}`);
  }
  
  return response.json();
}
```

### 4. Ticker Overview (Reference Data)

**Endpoint**: `GET /v3/reference/tickers/{ticker}`

**URL**: https://polygon.io/docs/rest/stocks/tickers/ticker-overview

**Description**: Get detailed information about a ticker

**Response Schema**:
```typescript
interface TickerOverviewResponse {
  status: string;
  request_id?: string;
  results: {
    ticker: string;
    name: string;
    market: string;
    locale: string;
    primary_exchange: string;
    type: string;
    active: boolean;
    currency_name: string;
    cik?: string;
    composite_figi?: string;
    share_class_figi?: string;
    market_cap?: number;
    phone_number?: string;
    address?: {
      address1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    description?: string;
    sic_code?: string;
    sic_description?: string;
    ticker_root?: string;
    homepage_url?: string;
    total_employees?: number;
    list_date?: string;
    branding?: {
      logo_url?: string;
      icon_url?: string;
    };
    share_class_shares_outstanding?: number;
    weighted_shares_outstanding?: number;
  };
}
```

## Useful Derived Fields for Alpha Scanner

### Spread Proxies (for Slippage Estimation)

```typescript
// Calculate bid-ask spread from lastQuote
function calculateSpreadBps(lastQuote: LastQuote): number {
  const spread = lastQuote.a - lastQuote.b;
  const midPrice = (lastQuote.a + lastQuote.b) / 2;
  return (spread / midPrice) * 10000; // Convert to basis points
}

// Relative Volume (RVOL)
function calculateRVOL(currentVolume: number, avgVolume: number): number {
  return currentVolume / avgVolume;
}

// Price vs VWAP
function calculateVWAPDistance(price: number, vwap: number): number {
  return (price - vwap) / vwap;
}
```

### Market Status Handling

```typescript
function isMarketOpen(snapshot: TickerSnapshot): boolean {
  return snapshot.market_status === 'open';
}

function getMarketHours(): { 
  preMarket: { start: string; end: string };
  regular: { start: string; end: string };
  afterHours: { start: string; end: string };
} {
  return {
    preMarket: { start: '04:00', end: '09:30' },    // ET
    regular: { start: '09:30', end: '16:00' },      // ET
    afterHours: { start: '16:00', end: '20:00' },   // ET
  };
}
```

## Error Handling & Retries

```typescript
interface PolygonError {
  status: string;
  error?: string;
  message?: string;
  request_id?: string;
}

export class PolygonApiError extends Error {
  constructor(
    public status: number,
    public response: PolygonError,
    message: string
  ) {
    super(message);
    this.name = 'PolygonApiError';
  }
}

// Retry with exponential backoff
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Don't retry on 4xx errors (except 429 rate limit)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Caching Strategy

```typescript
// Redis cache keys
const CACHE_KEYS = {
  FULL_SNAPSHOT: 'polygon:snapshot:full',
  TICKER_SNAPSHOT: (ticker: string) => `polygon:snapshot:${ticker}`,
  AGGREGATES: (ticker: string, timespan: string, from: string, to: string) => 
    `polygon:aggs:${ticker}:${timespan}:${from}:${to}`,
};

// Cache TTL (Time To Live)
const CACHE_TTL = {
  SNAPSHOT: 30,        // 30 seconds for real-time data
  AGGREGATES: 3600,    // 1 hour for historical data
  OVERVIEW: 86400,     // 24 hours for reference data
};
```

## WebSocket Integration (Future)

**Endpoint**: `wss://socket.polygon.io/stocks`

**Authentication**: Send `{"action":"auth","params":"API_KEY"}` on connect

**Subscription Types**:
```typescript
// Trade updates
{"action":"subscribe","params":"T.AAPL,T.MSFT"}

// Quote updates  
{"action":"subscribe","params":"Q.AAPL,Q.MSFT"}

// Aggregate bars (1-minute)
{"action":"subscribe","params":"AM.AAPL,AM.MSFT"}
```

## Testing with Fixtures

Create sample responses in `tests/fixtures/polygon/`:

```typescript
// tests/fixtures/polygon/full-market-snapshot.json
{
  "status": "OK",
  "count": 2,
  "results": [
    {
      "ticker": "AAPL",
      "todaysChangePerc": 1.5,
      "todaysChange": 2.75,
      "updated": 1704376800000,
      "market_status": "open",
      "day": {
        "c": 185.25,
        "h": 186.50,
        "l": 183.75,
        "o": 184.00,
        "v": 45231000,
        "vw": 185.12
      },
      "lastQuote": {
        "a": 185.26,
        "b": 185.24,
        "s": 100,
        "S": 200
      }
    }
  ]
}
```

## Rate Limiting Implementation

```typescript
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

// Usage
const rateLimiter = new RateLimiter(5, 60000); // 5 requests per minute

export async function makePolygonRequest<T>(fetchFn: () => Promise<T>): Promise<T> {
  await rateLimiter.checkLimit();
  return fetchFn();
}
```

## Resources

- **Official Documentation**: https://polygon.io/docs
- **API Status Page**: https://status.polygon.io/
- **Rate Limits**: https://polygon.io/docs/getting-started/rate-limits
- **WebSocket Docs**: https://polygon.io/docs/websocket/quickstart

---

**Last Updated**: 2025-01-04  
**API Version**: v2/v3 (Mixed endpoints)