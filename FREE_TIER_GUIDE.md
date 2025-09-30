# 🆓 Polygon Free Tier Guide - Alpha Scanner

## ✅ What You've Accomplished Today

1. **✅ Fixed CORS** - API now accepts requests from your frontend
2. **✅ Fixed Auth** - Supabase authentication working
3. **✅ Built Tracking System** - Signal history & trade journal backend ready
4. **✅ Optimized for Free Tier** - Scanner respects 5 req/min limit
5. **✅ Added Caching** - 12-hour result caching (instant subsequent scans)

---

## 🔑 Polygon Free Tier Constraints

According to the [Polygon.io Stocks Basic plan](https://polygon.io/pricing):

### **Rate Limits**
- ✅ **5 API calls/minute** (strict limit)
- ⏱️ **12 seconds required between calls** to stay within limit

### **Data Availability**
- ⚠️ **End-of-Day Data ONLY** - No real-time pricing
- ✅ **2 Years Historical Data** - Enough for technical indicators
- ✅ **All US Stocks** - Complete market coverage
- ✅ **Technical Indicators** - SMA, EMA, RSI, etc.
- ✅ **Minute Aggregates** - Historical intraday bars

### **What This Means for You**

#### **Prices are Yesterday's Close**
The prices you see (e.g., ZM at $76.69) are **correct** - they're yesterday's closing prices!
- Updates after market close (~5 PM ET)
- Not live intraday pricing
- Perfect for **end-of-day swing trading** strategies
- Not suitable for day trading or scalping

#### **Scan Time: ~2 Minutes (First Scan)**
- Scanner analyzes **10 symbols** from your watchlist
- 10 API calls × 12 seconds = **2 minutes total**
- **Subsequent scans are INSTANT** (cached for 12 hours)

---

## 🎯 Current Watchlist (10 Symbols)

Your scanner is configured to analyze these symbols:
```
AAPL, MSFT, GOOGL, TSLA, NVDA, META, AMZN, AMD, NFLX, UBER
```

### **How to Customize Your Watchlist**

Edit `/apps/api/.env` and add:
```bash
POLYGON_WATCHLIST=["AAPL","TSLA","NVDA","SPY","QQQ"]
```

**Maximum: 10 symbols** (to respect 5 req/min limit)

---

## ⚡ Scanner Optimizations Implemented

### **1. 12-Hour Result Caching**
```
First scan:  ~2 minutes (10 API calls)
2nd scan:    Instant! (from cache)
3rd scan:    Instant! (from cache)
...
After 12h:   ~2 minutes (cache expired, fresh data)
```

Since data only updates **end-of-day** anyway, there's no point rescanning every minute!

### **2. Fixed Watchlist Approach**
Instead of scanning 1000+ stocks (impossible on free tier), we:
- Focus on **10 high-quality symbols**
- Make exactly **10 API calls per scan**
- Respect the **5 req/min limit**

### **3. Rate Limiting**
Built-in 12-second delay between API calls ensures you never exceed limits.

---

## 📊 Expected Behavior

### **Dashboard "Scan Now" Button**

**First Click:**
```
⏳ "Scanning..." (takes ~2 minutes)
🔄 Progress: Analyzing AAPL... (12s)
🔄 Progress: Analyzing MSFT... (12s)
🔄 Progress: Analyzing GOOGL... (12s)
...
✅ "8 opportunities found"
```

**Second Click (within 12 hours):**
```
⚡ INSTANT! (from cache)
✅ "8 opportunities found"
```

### **Opportunity Detail Pages**

When you click "View Details" on a symbol:
- **If symbol is in watchlist** → Works instantly ✅
- **If symbol NOT in watchlist** → May take 12 seconds (1 API call) ⏱️

---

## 🚀 Next Steps

### **Immediate**
1. **Refresh your browser** at http://localhost:3001/
2. **Click "Run Preview"** (this will take ~2 minutes)
3. **Wait patiently** - you'll see opportunities populate
4. **Click "View Details"** on any opportunity
5. **Test "Track Outcome"** button

### **Optional Customization**
Edit your watchlist in `apps/api/.env`:
```bash
# Focus on tech stocks
POLYGON_WATCHLIST=["AAPL","MSFT","GOOGL","META","NVDA"]

# Or growth stocks
POLYGON_WATCHLIST=["TSLA","SHOP","ROKU","SNOW","DKNG"]

# Or indices + mega caps
POLYGON_WATCHLIST=["SPY","QQQ","AAPL","MSFT","AMZN"]
```

---

## 💡 Pro Tips for Free Tier

### **1. Scan Once Per Day**
Since data updates end-of-day, scanning more than once every 12 hours is pointless!

**Optimal workflow:**
- Run scan after market close (~5 PM ET)
- Review opportunities in evening
- Use tracking to log outcomes next day

### **2. Choose Your Watchlist Wisely**
Pick symbols that:
- ✅ You actually trade
- ✅ Have good liquidity (>1M daily volume)
- ✅ Match your strategy (growth, value, momentum, etc.)

### **3. Use the Cache!**
The 12-hour cache is your friend:
- Share scans with others (same results)
- Review multiple times without waiting
- Data freshness matches free tier updates anyway

---

## ⚠️ Troubleshooting

### **"Failed to load opportunities"**
- Wait the full 2 minutes for first scan
- Check API logs: `docker logs alpha-scanner-api --tail 50`
- Verify `USE_POLYGON_LIVE=true` in `apps/api/.env`

### **"Opportunity not found for symbol"**
Symbol not in your watchlist! Add it to `POLYGON_WATCHLIST`.

### **Prices seem "old"**
They are! Free tier = end-of-day data only. Prices update after market close.

---

## 📈 Upgrade Considerations

If you need **real-time data** or want to scan **more symbols**, consider:

**Polygon.io Stocks Starter ($99/mo):**
- 100 API calls/minute (20x faster!)
- Real-time market data during trading hours
- Scan hundreds of symbols

**For now, the FREE tier is perfect for:**
- Learning the platform
- End-of-day swing trading
- Tracking 10 core positions
- Building signal calibration history

---

## ✅ Summary

**You're now optimized for the FREE tier!** 🎉

- ✅ 10-symbol watchlist
- ✅ 12-hour caching
- ✅ Rate-limit compliant
- ✅ End-of-day pricing (expected)
- ✅ ~2 min first scan, instant after

**Go ahead and refresh the browser, click "Run Preview", and let the scanner do its thing!** ⚡
