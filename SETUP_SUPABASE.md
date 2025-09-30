# Supabase Setup Guide for Non-Developers

This guide will walk you through setting up the **signal tracking and trade journal** features in your Supabase database.

## Prerequisites

- Access to your Supabase dashboard
- Your project already has the `opportunities` table

## Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://app.supabase.com/
2. Select your Alpha Scanner project
3. Click on **"SQL Editor"** in the left sidebar (looks like `</>`)

## Step 2: Run the Migration

1. Click **"New Query"** button (top right)
2. Open the file: `apps/api/migrations/run_in_supabase.sql`
3. Copy the **entire contents** of that file
4. Paste it into the SQL Editor
5. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)

You should see:
```
Success. No rows returned
```

If you see any errors, copy the error message and let me know.

## Step 3: Verify the Setup

Run this verification query in the SQL Editor:

```sql
-- Check if tables were created
SELECT tablename 
FROM pg_tables 
WHERE tablename IN ('signal_history', 'trades');

-- Check if RLS policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('signal_history', 'trades');
```

You should see:
- 2 tables: `signal_history` and `trades`
- 2 policies: one for each table

## Step 4: Test the API (Optional)

**Option A: Using the Frontend**
1. Start your development server: `cd apps/web && pnpm dev`
2. Navigate to any opportunity detail page
3. Click **"Track Outcome"** button
4. Fill in the modal and submit
5. Check your Supabase dashboard → **Table Editor** → `signal_history`

**Option B: Using curl (if comfortable with terminal)**
```bash
curl -X POST http://localhost:8000/api/v1/tracking/signals \\
  -H "Content-Type: application/json" \\
  -d '{
    "symbol": "AAPL",
    "signal_score": 75.5,
    "p_target": 0.65,
    "entry_price": 150.00,
    "stop_price": 148.00,
    "target_price": 154.00,
    "rr_ratio": 2.0
  }'
```

## What You Just Created

### 1. **signal_history** table
Tracks every signal prediction vs actual outcome:
- Logs entry/stop/target prices when signal is generated
- Records what actually happened (target hit, stopped out, expired)
- Calculates actual R achieved
- Enables calibration analysis (predicted 65% → actual 68%?)

### 2. **trades** table
Your comprehensive trade journal:
- Full trade details (entry, exit, P&L)
- Performance metrics (win rate, profit factor, expectancy)
- Tags and notes for learning
- Statistics for continuous improvement

### 3. **RLS Policies**
Row Level Security ensures:
- You only see YOUR data
- Other users (when you add auth) only see THEIR data
- Full multi-tenancy support built-in

## Next Steps

1. ✅ **Database is ready!**
2. Start your API: `cd apps/api && docker-compose up -d` (or your preferred method)
3. Start your web app: `cd apps/web && pnpm dev`
4. Navigate to an opportunity and click "Track Outcome"
5. After tracking 10+ signals, check the calibration page (coming next!)

## Troubleshooting

### Error: "relation already exists"
This means the tables already exist. You're good to go!

### Error: "permission denied"
Make sure you're in the **SQL Editor** and not the **Table Editor**. The SQL Editor runs with admin permissions.

### Error: "function gen_random_uuid() does not exist"
Your Postgres version might be old. Replace `gen_random_uuid()` with `uuid_generate_v4()` in the SQL file.

### Tables created but RLS not working
Run this in SQL Editor:
```sql
ALTER TABLE signal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
```

## Support

If you encounter any issues:
1. Take a screenshot of the error
2. Share the SQL that caused it
3. Let me know and I'll help you fix it!

---

**You're now ready to start learning from your signals! 🎯**
