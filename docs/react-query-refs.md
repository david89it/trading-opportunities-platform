# TanStack Query (React Query) v5 Reference

This document contains implementation patterns, API references, and best practices for TanStack Query v5 in the Alpha Scanner project.

## Installation & Setup

```bash
npm install @tanstack/react-query
```

### Provider Setup

```typescript
// apps/web/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,   // 10 minutes (was cacheTime in v4)
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Key v5 Changes from v4

- `cacheTime` → `gcTime` (garbage collection time)
- `useQuery({ queryKey, queryFn })` object syntax required
- Improved TypeScript inference
- Better error handling and loading states

## Core Patterns

### Basic Query

```typescript
import { useQuery } from '@tanstack/react-query';

function Opportunities() {
  const {
    data: opportunities,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <OpportunityTable data={opportunities} />;
}
```

### Query with Parameters

```typescript
function OpportunityDetail({ symbol }: { symbol: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['opportunity', symbol],
    queryFn: () => fetchOpportunityBySymbol(symbol),
    enabled: !!symbol, // Only run query if symbol exists
  });

  // Component logic...
}
```

### Mutations

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function CreateTrade() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createTrade,
    onSuccess: () => {
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (error) => {
      console.error('Trade creation failed:', error);
    },
  });

  const handleSubmit = (tradeData: TradeData) => {
    mutation.mutate(tradeData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={mutation.isPending}>
        {mutation.isPending ? 'Creating...' : 'Create Trade'}
      </button>
    </form>
  );
}
```

## Project-Specific Patterns

### API Service Integration

```typescript
// apps/web/src/services/api.ts
export async function fetchOpportunities(): Promise<OpportunitiesResponse> {
  const response = await fetch('/api/v1/opportunities');
  if (!response.ok) {
    throw new Error('Failed to fetch opportunities');
  }
  return response.json();
}

export async function fetchOpportunityBySymbol(symbol: string): Promise<Opportunity> {
  const response = await fetch(`/api/v1/opportunities/${symbol}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch opportunity for ${symbol}`);
  }
  return response.json();
}
```

### Risk Sandbox Data

```typescript
import { useMutation } from '@tanstack/react-query';
import { runMonteCarloSimulation } from '../services/riskApi';

function RiskSandbox() {
  const [parameters, setParameters] = useState(defaultParams);

  const simulation = useMutation({
    mutationFn: runMonteCarloSimulation,
    onSuccess: (data) => {
      // Update charts with simulation results
      updateCharts(data);
    },
  });

  const runSimulation = () => {
    simulation.mutate(parameters);
  };

  return (
    <div>
      <ParameterControls 
        values={parameters}
        onChange={setParameters}
      />
      <button onClick={runSimulation} disabled={simulation.isPending}>
        {simulation.isPending ? 'Running...' : 'Run Simulation'}
      </button>
      {simulation.data && (
        <SimulationResults data={simulation.data} />
      )}
    </div>
  );
}
```

### Background Refetching

```typescript
// Opportunities Dashboard with live updates
function Dashboard() {
  const { data: opportunities } = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities,
    refetchInterval: 30000,           // Refetch every 30 seconds
    refetchOnWindowFocus: true,       // Refetch when window gains focus
    refetchOnReconnect: true,         // Refetch when network reconnects
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealthStatus,
    refetchInterval: 60000,           // Health check every minute
    retry: 1,                         // Only retry once for health checks
  });

  // Component logic...
}
```

## Error Handling Patterns

### Global Error Boundary

```typescript
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function AppWithErrorHandling() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div>
              <h2>Something went wrong</h2>
              <button onClick={resetErrorBoundary}>Try again</button>
            </div>
          )}
        >
          <App />
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

### Query-Specific Error Handling

```typescript
function OpportunitiesList() {
  const { data, error, isError, refetch } = useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchOpportunities,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });

  if (isError) {
    return (
      <ErrorMessage>
        <p>Failed to load opportunities: {error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </ErrorMessage>
    );
  }

  return <OpportunityTable data={data} />;
}
```

## Performance Optimizations

### Query Key Factory

```typescript
// utils/queryKeys.ts
export const queryKeys = {
  all: ['opportunities'] as const,
  lists: () => [...queryKeys.all, 'list'] as const,
  list: (filters: string) => [...queryKeys.lists(), { filters }] as const,
  details: () => [...queryKeys.all, 'detail'] as const,
  detail: (symbol: string) => [...queryKeys.details(), symbol] as const,
};

// Usage
const { data } = useQuery({
  queryKey: queryKeys.detail(symbol),
  queryFn: () => fetchOpportunityBySymbol(symbol),
});
```

### Prefetching

```typescript
import { useQueryClient } from '@tanstack/react-query';

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const queryClient = useQueryClient();

  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: ['opportunity', opportunity.symbol],
      queryFn: () => fetchOpportunityBySymbol(opportunity.symbol),
      staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    });
  };

  return (
    <div onMouseEnter={prefetchDetail}>
      <Link to={`/opportunities/${opportunity.symbol}`}>
        {opportunity.symbol} - {opportunity.signal_score}
      </Link>
    </div>
  );
}
```

### Selective Data Updates

```typescript
// Update specific fields without refetching entire dataset
const updateOpportunityStatus = useMutation({
  mutationFn: ({ symbol, status }: { symbol: string; status: string }) =>
    updateOpportunity(symbol, { guardrail_status: status }),
  onSuccess: (updatedOpportunity) => {
    queryClient.setQueryData(
      ['opportunity', updatedOpportunity.symbol],
      updatedOpportunity
    );
    
    // Update the list as well
    queryClient.setQueryData(['opportunities'], (old: OpportunitiesResponse) => ({
      ...old,
      opportunities: old.opportunities.map(opp =>
        opp.symbol === updatedOpportunity.symbol ? updatedOpportunity : opp
      ),
    }));
  },
});
```

## Testing Patterns

### Mock Service Worker (MSW)

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/v1/opportunities', (req, res, ctx) => {
    return res(
      ctx.json({
        opportunities: mockOpportunities,
        total: mockOpportunities.length,
        limit: 50,
        offset: 0,
        timestamp: new Date().toISOString(),
      })
    );
  }),
  
  rest.get('/api/v1/opportunities/:symbol', (req, res, ctx) => {
    const { symbol } = req.params;
    const opportunity = mockOpportunities.find(o => o.symbol === symbol);
    
    if (!opportunity) {
      return res(ctx.status(404), ctx.json({ error: 'Not found' }));
    }
    
    return res(ctx.json(opportunity));
  }),
];
```

### Test Utilities

```typescript
// tests/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

## DevTools Usage

The React Query DevTools provide:
- Query states and cache inspection
- Network request monitoring
- Query invalidation controls
- Performance insights

Enable in development:
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add to your App component
<ReactQueryDevtools initialIsOpen={false} />
```

## Common Anti-Patterns to Avoid

❌ **Don't manually manage loading states**
```typescript
// Bad
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);

useEffect(() => {
  setLoading(true);
  fetchData().then(setData).finally(() => setLoading(false));
}, []);
```

✅ **Use React Query's built-in states**
```typescript
// Good
const { data, isLoading } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});
```

❌ **Don't ignore error states**
```typescript
// Bad - no error handling
const { data } = useQuery({ queryKey: ['data'], queryFn: fetchData });
```

✅ **Handle errors gracefully**
```typescript
// Good
const { data, error, isError } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
});

if (isError) return <ErrorMessage error={error} />;
```

## Resources

- **Official Docs**: https://tanstack.com/query/latest/docs/framework/react/overview
- **Migration Guide**: https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5
- **Examples**: https://tanstack.com/query/latest/docs/framework/react/examples/simple
- **Community**: https://github.com/TanStack/query/discussions

---

**Last Updated**: 2025-01-04  
**TanStack Query Version**: v5.17.0