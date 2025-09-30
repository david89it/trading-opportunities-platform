# Alpha Scanner - PRD Refinements for Next Development Stage

**Document Version:** 1.0  
**Created:** 2025-01-05  
**Status:** Active Development Roadmap  
**Philosophy:** 80/20 Principle - Maximum Value, Minimum Complexity

---

## Executive Summary

This document refines the original PRD based on **actual evaluation findings** and focuses on delivering the **highest-value features** that transform the Alpha Scanner from a sophisticated prototype (~45% complete) into a **production-ready trading analytics platform**.

### Key Principles

1. **Manual-First Approach**: User clicks "Scan Now" instead of building complex scheduling infrastructure
2. **Polygon Free Tier Optimization**: 5 requests/minute = smart caching and strategic data usage
3. **Learning Over Automation**: Prioritize tracking and calibration over automation
4. **Supabase-Native**: Leverage Supabase fully (not just auth) for developer-friendly backend
5. **Progressive Enhancement**: Each feature adds value independently

---

## Current State Assessment

### ✅ What's Working Well
- **Risk Sandbox**: Exceptional Monte Carlo simulation with great UX
- **Core Scanner Logic**: Sophisticated multi-factor scoring (200+ indicators)
- **Supabase Auth**: JWT validation, RLS policies working
- **Type Safety**: Pydantic + TypeScript preventing runtime errors
- **Docker Deployment**: Consistent local/production environments

### ❌ Critical Gaps
- **No Signal Performance Tracking**: Can't learn if signals work
- **No Trade Journal**: Can't close the feedback loop
- **No Visual Confirmation**: Charts would help validate signals
- **Manual Scan UX**: Needs refinement for daily use
- **Calibration Invisible**: Analytical mapping works but not transparent

### 🎯 Production Blockers (from PRD Gates)
1. **Calibration Gate**: Need historical tracking to measure ≤10% error
2. **Expectancy Gate**: Need 300+ tracked trades to verify +0.1R/trade
3. **Monte Carlo Gate**: ✅ Can already verify in Risk Sandbox

---

## Development Priorities (80/20 Analysis)

### Phase 1: Close the Learning Loop (Weeks 1-2)
**Impact: 🔥🔥🔥 (Enables everything else)**

The #1 priority is creating the **feedback system** that turns this from a signal generator into a learning platform.

#### 1.1 Signal History Persistence
**Value:** Without this, we're flying blind. This enables all calibration work.

```python
# What we're building
@router.post("/opportunities/{id}/track")
async def track_signal_outcome(
    id: str,
    outcome: SignalOutcome,  # hit_target, stopped_out, still_open
    exit_price: float,
    exit_time: datetime,
    user_id: str = Depends(require_auth)
):
    """
    User manually logs what happened to a signal.
    We calculate:
    - Did it hit target before stop? (boolean)
    - MFE (Maximum Favorable Excursion)
    - MAE (Maximum Adverse Excursion)  
    - Time to target/stop
    - Actual R achieved
    """
```

**Database Extension:**
```sql
-- Extend existing signal_history table
ALTER TABLE signal_history ADD COLUMN IF NOT EXISTS
  outcome TEXT,  -- 'target_hit', 'stopped_out', 'expired', 'still_open'
  exit_price NUMERIC,
  exit_time TIMESTAMPTZ,
  mfe NUMERIC,  -- Max favorable as % of entry
  mae NUMERIC,  -- Max adverse as % of entry
  actual_r NUMERIC,  -- Actual R achieved (+ or -)
  days_held INT,
  user_id UUID REFERENCES auth.users(id);

-- RLS policy for user-scoped access
ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can track own signals" ON signal_history
  FOR ALL USING (auth.uid() = user_id);
```

**Supabase Helper for Non-Developers:**
```typescript
// apps/web/src/services/signalTracking.ts
import { supabase } from './supabaseClient'

export async function trackSignalOutcome(signal: {
  opportunityId: string
  symbol: string
  outcome: 'target_hit' | 'stopped_out' | 'expired'
  exitPrice: number
  exitTime: string
  notes?: string
}) {
  const { data, error } = await supabase
    .from('signal_history')
    .insert({
      opportunity_id: signal.opportunityId,
      symbol: signal.symbol,
      outcome: signal.outcome,
      exit_price: signal.exitPrice,
      exit_time: signal.exitTime,
      notes: signal.notes,
      // Supabase auto-fills user_id via RLS
    })
  
  if (error) throw error
  return data
}
```

**UI Component:**
```tsx
// Simple button on opportunity detail page
<button onClick={() => setTrackingModalOpen(true)}>
  📊 Log Outcome
</button>

// Modal with 3 buttons + price input
<TrackingModal>
  <button onClick={() => logOutcome('target_hit')}>✅ Hit Target</button>
  <button onClick={() => logOutcome('stopped_out')}>❌ Stopped Out</button>
  <button onClick={() => logOutcome('expired')}>⏱️ Expired</button>
  <input type="number" placeholder="Exit Price" />
  <textarea placeholder="Notes (optional)" />
</TrackingModal>
```

**Effort:** 2-3 days  
**Files to Create/Modify:**
- `apps/api/app/routers/signal_tracking.py` (new)
- `apps/api/alembic/versions/002_extend_signal_history.py` (new migration)
- `apps/web/src/pages/SignalTracker.tsx` (new page)
- `apps/web/src/components/TrackingModal.tsx` (new)

---

#### 1.2 Trade Journal API & UI
**Value:** Professional traders live in their journals. This makes the app daily-use sticky.

**Supabase Schema (Developer-Friendly):**
```sql
-- Using Supabase's built-in features
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Trade Identification
  symbol TEXT NOT NULL,
  opportunity_id UUID,  -- Link to the signal that generated this
  
  -- Execution Details
  side TEXT CHECK (side IN ('long', 'short')) DEFAULT 'long',
  entry_time TIMESTAMPTZ NOT NULL,
  entry_price NUMERIC NOT NULL,
  position_size_shares INT NOT NULL,
  
  -- Risk Management
  stop_loss NUMERIC NOT NULL,
  target_1 NUMERIC NOT NULL,
  target_2 NUMERIC,
  
  -- Exit Details
  exit_time TIMESTAMPTZ,
  exit_price NUMERIC,
  exit_reason TEXT,  -- 'target_hit', 'stopped_out', 'manual_close', 'trailing_stop'
  
  -- Performance
  pnl_usd NUMERIC,
  pnl_r NUMERIC,  -- In R units
  fees_usd NUMERIC DEFAULT 0,
  slippage_bps NUMERIC,
  
  -- Metadata
  tags TEXT[],  -- e.g., ['gap_play', 'earnings', 'breakout']
  notes TEXT,
  screenshots TEXT[],  -- URLs to Supabase Storage
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_entry_time ON trades(entry_time DESC);

-- RLS Policies
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();
```

**API Endpoints:**
```python
# apps/api/app/routers/trades.py
@router.post("/trades", response_model=Trade)
async def create_trade(
    trade: TradeCreate,
    user_id: str = Depends(require_auth)
):
    """Log a new trade"""
    # Supabase handles user_id via RLS
    pass

@router.get("/trades", response_model=List[Trade])
async def list_trades(
    symbol: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = 100,
    user_id: str = Depends(require_auth)
):
    """Get user's trade history with filters"""
    pass

@router.get("/trades/stats", response_model=TradeStats)
async def get_trade_stats(
    period: str = "all",  # 'week', 'month', 'quarter', 'year', 'all'
    user_id: str = Depends(require_auth)
):
    """
    Calculate trading statistics:
    - Total trades
    - Win rate
    - Average R
    - Profit factor
    - Max drawdown
    - Best/worst trades
    """
    pass
```

**Simple Trade Journal UI:**
```tsx
// apps/web/src/pages/TradeJournal.tsx
export default function TradeJournal() {
  const { data: trades } = useQuery({
    queryKey: ['trades'],
    queryFn: api.getTrades
  })
  
  const { data: stats } = useQuery({
    queryKey: ['trade-stats'],
    queryFn: api.getTradeStats
  })
  
  return (
    <div>
      <StatsCards stats={stats} />
      <TradesTable trades={trades} />
      <AddTradeButton />
    </div>
  )
}
```

**Effort:** 3-4 days  
**Files:**
- `apps/api/app/routers/trades.py` (new)
- `apps/api/alembic/versions/003_create_trades.py` (migration)
- `apps/web/src/pages/TradeJournal.tsx` (new)
- `apps/web/src/services/tradesApi.ts` (new)

---

#### 1.3 Basic Calibration Visualization
**Value:** Show users and ourselves how accurate our probability estimates are.

**Simple Approach (No ML Yet):**
```python
# apps/api/app/routers/calibration.py
@router.get("/calibration/summary")
async def get_calibration_summary(user_id: str = Depends(require_auth)):
    """
    Bucket signals by predicted probability (10% buckets)
    Compare predicted vs actual hit rate
    
    Returns:
    {
      "buckets": [
        {
          "predicted_range": "30-40%",
          "predicted_midpoint": 0.35,
          "actual_hit_rate": 0.42,
          "sample_size": 15,
          "calibration_error": 0.07  # |predicted - actual|
        },
        ...
      ],
      "overall_brier_score": 0.15,
      "total_signals_tracked": 87
    }
    """
```

**Dead-Simple UI:**
```tsx
// apps/web/src/pages/Calibration.tsx
<CalibrationChart>
  {/* Scatter plot: predicted on X, actual on Y */}
  {/* Diagonal line = perfect calibration */}
  {/* Dots = our actual performance */}
  {buckets.map(b => (
    <Dot 
      x={b.predicted_midpoint} 
      y={b.actual_hit_rate}
      size={b.sample_size}
      color={Math.abs(b.calibration_error) < 0.1 ? 'green' : 'orange'}
    />
  ))}
</CalibrationChart>

<Interpretation>
  {overallError < 0.10 
    ? "✅ Calibration PASSED - Ready for production" 
    : `⚠️ Need ${300 - totalSignals} more tracked signals`}
</Interpretation>
```

**Effort:** 1-2 days  
**Files:**
- `apps/api/app/routers/calibration.py` (new)
- `apps/web/src/pages/Calibration.tsx` (new)

---

### Phase 2: Visual Confidence (Week 3)
**Impact: 🔥🔥 (Traders need to see price action)**

#### 2.1 TradingView Lightweight Charts Integration
**Value:** A picture is worth 1000 numbers. Visual confirmation builds trust.

**Implementation (Already in docs):**
```tsx
// apps/web/src/components/PriceChart.tsx
import { createChart, ColorType } from 'lightweight-charts'

export function PriceChart({ 
  symbol, 
  entry, 
  stop, 
  target1, 
  target2 
}: OpportunityChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const chart = createChart(chartContainerRef.current!, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d5db',
      },
      width: 800,
      height: 400,
    })
    
    const candlestickSeries = chart.addCandlestickSeries()
    
    // Fetch bars from API
    fetch(`/api/v1/opportunities/${symbol}/bars`)
      .then(r => r.json())
      .then(bars => {
        candlestickSeries.setData(bars)
        
        // Add entry/stop/target lines
        const lineSeries = chart.addLineSeries({ color: '#3b82f6' })
        lineSeries.setData([
          { time: bars[0].time, value: entry },
          { time: bars[bars.length - 1].time, value: entry }
        ])
        
        // Repeat for stop (red), target1 (green), target2 (green dotted)
      })
    
    return () => chart.remove()
  }, [symbol])
  
  return (
    <div>
      <div ref={chartContainerRef} />
      <Attribution>
        Charts powered by <a href="https://www.tradingview.com/">TradingView</a>
      </Attribution>
    </div>
  )
}
```

**API Endpoint for Bars:**
```python
@router.get("/opportunities/{symbol}/bars")
async def get_symbol_bars(symbol: str, days: int = 100):
    """Get historical bars for charting"""
    client = await get_polygon_client()
    bars = await client.get_aggregates(symbol, limit=days)
    return [{"time": b.t // 1000, "open": b.o, "high": b.h, "low": b.l, "close": b.c} for b in bars]
```

**Effort:** 2-3 days  
**Files:**
- `apps/web/src/components/PriceChart.tsx` (new)
- `apps/api/app/routers/opportunities.py` (add bars endpoint)

---

### Phase 3: Scan UX Refinement (Week 4)
**Impact: 🔥 (Make daily use delightful)**

#### 3.1 Smart Manual Scanning
**Value:** Better than automated scanning for MVP - user controls when to scan.

**Free Tier Optimization:**
```python
# apps/api/app/services/smart_scanner.py
class SmartScanner:
    """
    Polygon Free Tier: 5 req/min = 12s between calls
    
    Strategy:
    1. Maintain a watchlist of ~20 symbols (configurable)
    2. On "Scan Now" click, iterate watchlist (4 mins total)
    3. Cache aggressively (5-min TTL)
    4. Show progress bar to user
    """
    
    async def scan_watchlist(
        self,
        watchlist: List[str],
        progress_callback: Callable[[str, int, int], None]
    ) -> List[Opportunity]:
        """
        Scan a watchlist respecting free tier limits.
        
        Progress callback: symbol, current, total
        """
        opportunities = []
        
        for i, symbol in enumerate(watchlist):
            progress_callback(symbol, i + 1, len(watchlist))
            
            try:
                opp = await self.analyze_symbol(symbol)
                if opp and opp.signal_score >= 60:
                    opportunities.append(opp)
            except Exception as e:
                logger.warning(f"Failed to analyze {symbol}: {e}")
            
            # Free tier spacing (12s)
            await asyncio.sleep(12)
        
        return sorted(opportunities, key=lambda x: x.signal_score, reverse=True)
```

**UI with Progress:**
```tsx
<button onClick={startScan} disabled={isScanning}>
  {isScanning ? (
    <div>
      <Spinner />
      Scanning {currentSymbol} ({progress.current}/{progress.total})
      <ProgressBar percent={progress.percent} />
    </div>
  ) : (
    '🔍 Scan Watchlist'
  )}
</button>
```

**Watchlist Management (Supabase):**
```sql
CREATE TABLE watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlists" ON watchlists
  FOR ALL USING (auth.uid() = user_id);
```

**Effort:** 2-3 days  
**Files:**
- `apps/api/app/services/smart_scanner.py` (new)
- `apps/web/src/components/WatchlistManager.tsx` (new)
- `apps/api/alembic/versions/004_create_watchlists.py` (migration)

---

### Phase 4: Security & Polish (Week 5)
**Impact: 🔥 (Production readiness)**

#### 4.1 Security Quick Wins

**Rate Limiting (FastAPI Middleware):**
```python
# apps/api/app/middleware/rate_limit.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Apply to routes
@router.post("/scan/preview")
@limiter.limit("10/minute")  # 10 scans per minute max
async def scan_preview(request: Request):
    pass
```

**Security Headers:**
```python
# apps/api/app/middleware/security.py
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.gzip import GZipMiddleware

app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.ALLOWED_HOSTS)
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if not settings.DEBUG:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://unpkg.com; "  # For TradingView
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://*.supabase.co"
        )
    return response
```

**Dependency Scanning (GitHub Actions):**
```yaml
# .github/workflows/security.yml
name: Security Scan
on: [push, pull_request]

jobs:
  python-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Safety check
        run: |
          cd apps/api
          pip install safety
          safety check --json

  npm-security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run npm audit
        run: |
          cd apps/web
          npm audit --audit-level=moderate
```

**Effort:** 1-2 days  
**Files:**
- `apps/api/app/middleware/rate_limit.py` (new)
- `apps/api/app/middleware/security.py` (new)
- `.github/workflows/security.yml` (new)

---

#### 4.2 Supabase Optimization (For Non-Developers)

**Connection Pooling Setup:**
```python
# apps/api/app/db/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Use pooled connection for API requests
engine = create_async_engine(
    settings.SUPABASE_DB_POOL_URL,  # Port 6543 with pgbouncer
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=settings.DEBUG,
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db_session():
    async with AsyncSessionLocal() as session:
        yield session
```

**Supabase Best Practices Guide (New Doc):**
```markdown
# docs/supabase-guide.md

## For Non-Developers: Supabase Dashboard Cheat Sheet

### 1. Table Editor
- **Location**: Table Editor tab in Supabase dashboard
- **Create Table**: Click "New table" button
  - ✅ Always enable RLS (Row Level Security)
  - ✅ Add `user_id UUID` column for user-scoped data
  - ✅ Set `user_id` foreign key to `auth.users(id)`

### 2. RLS Policies (Security Rules)
- **Where**: Table Editor > Click table > "Add RLS Policy"
- **Template for user-scoped data**:
  ```sql
  -- Policy name: "Users access own records"
  -- Operation: ALL
  -- Using: auth.uid() = user_id
  ```

### 3. Storage (For Screenshots, Exports)
- **Create Bucket**: Storage > New Bucket
  - Name: `trade-screenshots`
  - Public: No (private)
  - RLS Policy:
    ```sql
    -- Allow users to upload to own folder
    (storage.foldername(name))[1] = auth.uid()::text
    ```

### 4. Useful SQL Queries (Database > SQL Editor)

**Check table sizes:**
```sql
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Count active users:**
```sql
SELECT COUNT(DISTINCT user_id) as active_users
FROM opportunities
WHERE ts > NOW() - INTERVAL '30 days';
```

**Trade stats for debugging:**
```sql
SELECT 
  COUNT(*) as total_trades,
  AVG(pnl_r) as avg_r,
  SUM(CASE WHEN pnl_r > 0 THEN 1 ELSE 0 END)::float / COUNT(*) as win_rate
FROM trades
WHERE user_id = 'paste-user-id-here';
```

### 5. Monitoring

**Database > Logs**:
- Filter by "Error" to see RLS policy blocks or connection issues

**Database > Performance**:
- Check query performance
- Add indexes if queries are slow (look for "Seq Scan")

### 6. Backups

**Settings > Backups**:
- Free tier: Daily backups, 7-day retention
- Download backup before making big schema changes
```

**Effort:** 1 day (documentation + optimization)  
**Files:**
- `docs/supabase-guide.md` (new)
- `apps/api/app/db/database.py` (update)

---

## Polygon.io Free Tier Strategy

### What We Can Do (5 requests/minute)

**Realistic Scan Approach:**
```python
# Daily workflow for free tier:

1. Morning (8:30 AM ET):
   - User clicks "Scan Watchlist" (20 symbols)
   - Takes 4 minutes (12s spacing * 20)
   - Results cached for 5 minutes
   
2. Throughout Day:
   - User manually requests specific symbol updates
   - Each click = 1 API call
   - 5 symbols max per minute
   
3. End of Day (4:00 PM ET):
   - Optional: Scan watchlist again
   - User reviews updated opportunities
   
4. Caching Maximizes Free Tier:
   - Aggregate bars: 1-hour cache
   - Ticker snapshots: 5-minute cache
   - If multiple users, cache is shared
```

**Fixture Fallback Strategy:**
```python
# Configuration for different environments
class ScanMode(Enum):
    FIXTURES = "fixtures"      # Development, unlimited
    FREE_TIER = "free_tier"    # 5 req/min, careful
    PAID_TIER = "paid_tier"    # 100+ req/min

# Smart detection
if not settings.POLYGON_API_KEY:
    mode = ScanMode.FIXTURES
elif settings.POLYGON_TIER == "free":
    mode = ScanMode.FREE_TIER
else:
    mode = ScanMode.PAID_TIER
```

---

## Testing Strategy (Practical Approach)

### Priority Tests (Phase 1-4)

**Backend:**
```python
# High-value tests to add
tests/
  test_signal_tracking.py      # Track outcomes correctly
  test_trade_journal.py         # CRUD operations
  test_calibration_calc.py      # Math is right
  test_supabase_rls.py         # Security policies work
```

**Frontend (Vitest):**
```typescript
// tests/components/
//   TrackingModal.test.tsx     # User can log outcomes
//   TradeJournal.test.tsx      # Trade list renders
//   PriceChart.test.tsx        # Chart loads without crashing

// tests/integration/
//   scan-and-track.test.tsx    # End-to-end happy path
```

**E2E (Playwright) - Critical Paths Only:**
```typescript
test('User can scan, save, and track an opportunity', async ({ page }) => {
  await page.goto('/auth')
  await page.fill('input[type=email]', 'test@example.com')
  await page.click('button:has-text("Sign In")')
  // ... magic link flow in test mode
  
  await page.goto('/dashboard')
  await page.click('button:has-text("Scan Watchlist")')
  await page.waitForSelector('[data-testid="opportunity-row"]')
  
  await page.click('[data-testid="opportunity-row"]:first-child')
  await page.click('button:has-text("Log Outcome")')
  await page.click('button:has-text("Hit Target")')
  
  // Verify it's in trade journal
  await page.goto('/journal')
  await expect(page.locator('[data-testid="trade-row"]')).toBeVisible()
})
```

**Effort:** 2-3 days (spread across phases)

---

## Deferred Features (Post-MVP)

### Lower Priority (Can Wait)
1. **Automated Scheduling** - User can click "Scan Now" for MVP
2. **Full VDS Skin** - Current UI is professional enough
3. **Email Alerts** - In-app notifications sufficient for MVP
4. **Mobile App** - Responsive web is fine for traders at desk
5. **Advanced Analytics** - Nice to have, not blocker
6. **WebSocket Real-Time** - Snapshots are fast enough

### Reasons to Defer
- **Scheduling**: Adds complexity (Celery/APScheduler) without user value vs. manual
- **VDS**: Cosmetic, current design is clean
- **Alerts**: Email adds SMTP config, in-app is simpler
- **Mobile**: Traders use desktops for analysis
- **Analytics**: Basic stats in journal are sufficient
- **WebSocket**: Free tier doesn't support it well anyway

---

## Success Metrics (How We Know It's Working)

### Week 2 (Phase 1 Complete)
- ✅ Users can log at least 1 signal outcome
- ✅ Trades table has at least 1 entry per test user
- ✅ Calibration page shows "Need X more signals"

### Week 4 (Phase 2-3 Complete)
- ✅ Charts render on detail page
- ✅ Users can scan watchlist in <5 minutes
- ✅ At least 10 tracked signals in production

### Week 6 (Phase 4 Complete)
- ✅ Security headers in place
- ✅ Rate limiting prevents abuse
- ✅ Dependencies scanned (no critical CVEs)
- ✅ Supabase guide helps non-developer navigate dashboard

### Production Gates (Original PRD)
| Gate | Metric | Target | Current | ETA |
|------|--------|--------|---------|-----|
| Calibration | Decile Error | ≤10% | N/A (need data) | Week 8+ (need 50+ signals) |
| Expectancy | Net R | >+0.1R/trade | N/A (need data) | Week 12+ (need 300 trades) |
| Monte Carlo | P(≥2×) | >40% | ✅ Verifiable | Now |

---

## Development Workflow

### Daily Routine (Developer)
```bash
# Morning
git pull
pnpm dev          # Starts API + Web
# Open http://127.0.0.1:5173

# Code, test, commit
git add .
git commit -m "feat(tracking): Add signal outcome logging"

# Push & deploy
git push
# CI runs tests
# Auto-deploy to production (if tests pass)
```

### Database Changes (Alembic)
```bash
# Create migration
cd apps/api
alembic revision -m "add signal outcomes"

# Edit migration file (apps/api/alembic/versions/xxx_add_signal_outcomes.py)

# Apply locally
alembic upgrade head

# Commit migration
git add alembic/versions/xxx_add_signal_outcomes.py
git commit -m "db: Add signal outcomes tracking"

# Production (Supabase): Run migration SQL in dashboard or via CLI
```

### Supabase Changes (For Non-Developer)
1. **Test in local dev first**: Use local Postgres to test
2. **Backup production**: Download backup from Supabase dashboard
3. **Run SQL in Supabase SQL Editor**: Copy from migration file
4. **Verify**: Check Table Editor that columns/policies exist
5. **Test with API**: Make request, check logs for errors

---

## Estimated Timeline

| Phase | Duration | Key Deliverables | Risk Level |
|-------|----------|------------------|------------|
| **Phase 1** | 2 weeks | Signal tracking, trade journal, basic calibration | Low (straightforward CRUD) |
| **Phase 2** | 1 week | TradingView charts | Low (well-documented library) |
| **Phase 3** | 1 week | Smart scanning, watchlists | Medium (rate limiting complexity) |
| **Phase 4** | 1 week | Security, Supabase guide | Low (mostly config) |
| **Buffer** | 1 week | Testing, bug fixes, polish | - |
| **TOTAL** | **6 weeks** | Production-ready MVP | - |

### After 6 Weeks, We Have:
✅ Signal tracking (closes learning loop)  
✅ Trade journal (professional tool)  
✅ Visual confirmation (charts)  
✅ Efficient scanning (free tier optimized)  
✅ Production security (headers, rate limits, RLS)  
✅ Calibration visibility (path to gates)  
✅ Non-developer can manage Supabase

### What We DON'T Have (and don't need):
❌ Automated scheduling  
❌ Email alerts  
❌ Mobile app  
❌ Full VDS skin  
❌ Advanced analytics  
❌ WebSocket streaming

**Result**: A **professional, production-ready trading analytics platform** that traders use daily.

---

## Next Steps

1. **Review This Document Together**
   - Discuss priorities
   - Adjust timeline
   - Clarify Supabase questions

2. **Set Up Development Environment**
   - Ensure Supabase project is ready
   - Create necessary tables (migrations ready)
   - Test auth flow

3. **Start Phase 1**
   - Begin with signal tracking (highest value)
   - Daily standups to track progress
   - Ship features as they complete (no big bang)

---

## Questions for Discussion

1. **Watchlist Size**: Comfortable with ~20 symbols for free tier? (4 min scan)
2. **Supabase Access**: Do you have admin access to the Supabase dashboard?
3. **Deployment**: Using Vercel, Railway, Docker on VPS, or other?
4. **Design Tweaks**: Happy with current UI or want specific VDS components?
5. **Testing**: Run tests manually or set up CI/CD (GitHub Actions)?

---

**Document Prepared By:** AI Evaluation + Refinement Process  
**Next Review:** After Phase 1 completion (Week 2)  
**Success Definition:** Users tracking signals, building calibration data, daily use of journal
