-- Alpha Scanner: Signal History & Trade Journal Tables
-- Run this in your Supabase SQL Editor
-- This creates the tracking infrastructure for learning and calibration

-- ============================================
-- 1. CREATE SIGNAL_HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS signal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opportunity_id UUID,
    symbol VARCHAR(10) NOT NULL,
    signal_score NUMERIC(10, 2) NOT NULL,
    p_target NUMERIC(10, 4) NOT NULL,
    
    -- Signal details at time of generation
    entry_price NUMERIC(10, 2),
    stop_price NUMERIC(10, 2),
    target_price NUMERIC(10, 2),
    rr_ratio NUMERIC(10, 2),
    
    -- Outcome tracking
    outcome VARCHAR(20), -- 'target_hit', 'stopped_out', 'expired', 'still_open'
    entry_time TIMESTAMP WITH TIME ZONE,
    exit_price NUMERIC(10, 2),
    exit_time TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics
    mfe NUMERIC(10, 4), -- Maximum Favorable Excursion (percentage)
    mae NUMERIC(10, 4), -- Maximum Adverse Excursion (percentage)
    actual_r NUMERIC(10, 4), -- Actual R achieved
    days_held INTEGER,
    
    -- Metadata
    notes TEXT,
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE TRADES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Trade identification
    symbol VARCHAR(10) NOT NULL,
    opportunity_id UUID,
    side VARCHAR(10) NOT NULL DEFAULT 'long', -- 'long' or 'short'
    
    -- Entry details
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_price NUMERIC(10, 2) NOT NULL,
    position_size_shares INTEGER NOT NULL,
    stop_loss NUMERIC(10, 2) NOT NULL,
    target_1 NUMERIC(10, 2) NOT NULL,
    target_2 NUMERIC(10, 2),
    
    -- Exit details
    exit_time TIMESTAMP WITH TIME ZONE,
    exit_price NUMERIC(10, 2),
    exit_reason VARCHAR(50), -- 'target_hit', 'stopped_out', 'manual_close', 'trailing_stop'
    
    -- Performance
    pnl_usd NUMERIC(10, 2),
    pnl_r NUMERIC(10, 4), -- P&L in R units
    fees_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
    slippage_bps NUMERIC(10, 2),
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    screenshots TEXT[],
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Signal history indexes
CREATE INDEX IF NOT EXISTS ix_signal_history_user_id ON signal_history(user_id);
CREATE INDEX IF NOT EXISTS ix_signal_history_symbol ON signal_history(symbol);
CREATE INDEX IF NOT EXISTS ix_signal_history_outcome ON signal_history(outcome);
CREATE INDEX IF NOT EXISTS ix_signal_history_created_at ON signal_history(created_at);

-- Trades indexes
CREATE INDEX IF NOT EXISTS ix_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS ix_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS ix_trades_entry_time ON trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS ix_trades_exit_time ON trades(exit_time DESC);

-- ============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. CREATE RLS POLICIES
-- ============================================

-- Signal History Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'signal_history' 
        AND policyname = 'Users manage own signal_history'
    ) THEN
        CREATE POLICY "Users manage own signal_history" ON signal_history
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Trades Policies  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'trades' 
        AND policyname = 'Users manage own trades'
    ) THEN
        CREATE POLICY "Users manage own trades" ON trades
        FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================
-- 6. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ADD UPDATED_AT TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS set_signal_history_updated_at ON signal_history;
CREATE TRIGGER set_signal_history_updated_at
BEFORE UPDATE ON signal_history
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_trades_updated_at ON trades;
CREATE TRIGGER set_trades_updated_at
BEFORE UPDATE ON trades
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify everything worked:
-- SELECT * FROM pg_tables WHERE tablename IN ('signal_history', 'trades');
-- SELECT * FROM pg_policies WHERE tablename IN ('signal_history', 'trades');
-- SELECT * FROM pg_indexes WHERE tablename IN ('signal_history', 'trades');

-- ============================================
-- SUCCESS!
-- ============================================
-- Your tracking infrastructure is now ready.
-- The API endpoints are already implemented and waiting to use these tables.
-- Next: Test the frontend UI components to start tracking signals!
