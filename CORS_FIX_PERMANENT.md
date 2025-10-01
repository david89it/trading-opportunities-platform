# 🔒 CORS Configuration - Permanent Fix

**Date:** October 1, 2025  
**Issue:** CORS policy blocking frontend requests  
**Status:** ✅ **PERMANENTLY FIXED**

---

## 🚨 **What Was the Problem?**

### **Error Message:**
```
Access to fetch at 'http://localhost:8000/api/v1/opportunities' 
from origin 'http://localhost:3000' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### **Root Cause:**
The **frontend (Vite) runs on port 3000** (configured in `vite.config.ts`), but the **backend CORS settings only allowed ports 3001 and 5173**.

**Result:** Browser blocked all API requests due to origin mismatch.

---

## ✅ **The Permanent Solution**

### **1. Updated CORS Allowed Hosts**
**File:** `apps/api/app/core/config.py`

```python
ALLOWED_HOSTS: List[str] = Field(
    default=[
        "http://127.0.0.1:3000",  # ✅ Added - Vite configured port
        "http://localhost:3000",   # ✅ Added - Vite configured port
        "http://127.0.0.1:3001",  # Legacy fallback
        "http://localhost:3001",   # Legacy fallback
        "http://127.0.0.1:5173",  # Vite default port
        "http://localhost:5173"    # Vite default port
    ],
    description="Allowed CORS origins"
)
```

**Why all three ports?**
- **3000**: Current Vite configuration (see `apps/web/vite.config.ts`)
- **3001**: Previous configuration (kept for compatibility)
- **5173**: Vite's out-of-the-box default

### **2. Updated CORS Middleware**
**File:** `apps/api/app/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], # ✅ Added OPTIONS + PATCH
    allow_headers=["*"],
    expose_headers=["*"],  # ✅ Added for proper response headers
)
```

**What changed:**
- ✅ Added `OPTIONS` method (CORS preflight requests)
- ✅ Added `PATCH` method (tracking API updates)
- ✅ Added `expose_headers` (proper response header handling)

---

## 🔍 **Why This Happened**

### **Timeline of Confusion:**

1. **Vite Default:** Port 5173
2. **Custom Config:** Changed to port 3000 in `vite.config.ts`
3. **CORS Setup:** Only configured for 3001 and 5173
4. **Result:** Port mismatch = CORS errors

### **Why Port 3000?**
Looking at `apps/web/vite.config.ts`:
```typescript
server: {
  port: 3000,  // <-- Explicitly set to 3000
  host: true,
  // ...
}
```

---

## 📋 **Verification Checklist**

To verify CORS is working:

### **1. Check Frontend Port**
```bash
# Look at vite.config.ts
grep "port:" apps/web/vite.config.ts

# Expected output: port: 3000
```

### **2. Check Backend CORS Config**
```bash
# Check allowed hosts
grep -A 10 "ALLOWED_HOSTS" apps/api/app/core/config.py

# Should include: localhost:3000 and 127.0.0.1:3000
```

### **3. Test CORS Preflight**
```bash
curl -v \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  http://localhost:8000/api/v1/opportunities 2>&1 | grep "Access-Control"

# Should return: 200 OK (not 400 Bad Request)
```

### **4. Check Browser Console**
- Open browser at `http://localhost:3000`
- Check Network tab (F12)
- Should see: Status 200 for all API calls
- Should NOT see: CORS policy errors

---

## 🛡️ **How to Prevent This Forever**

### **Rule #1: Port Changes Require CORS Updates**
**If you ever change Vite port:**
1. Update `apps/web/vite.config.ts` → `server.port`
2. Update `apps/api/app/core/config.py` → `ALLOWED_HOSTS`
3. Rebuild API container: `docker-compose up -d --build api`

### **Rule #2: Always Include Both Formats**
For any port, add BOTH:
- `http://localhost:PORT`
- `http://127.0.0.1:PORT`

Why? Some browsers use `localhost`, others use `127.0.0.1`.

### **Rule #3: After CORS Changes, Always Rebuild**
```bash
# CORS config changes require container rebuild
docker-compose up -d --build api

# Simple restart is NOT enough!
# ❌ docker-compose restart api  # Won't pick up code changes
# ✅ docker-compose up -d --build api  # Will rebuild and apply changes
```

---

## 🧪 **Testing After Changes**

### **Quick Test:**
```bash
# 1. Start backend
docker-compose up -d

# 2. Start frontend (separate terminal)
cd apps/web
pnpm dev

# 3. Open browser
# http://localhost:3000

# 4. Check console (F12)
# Should see NO CORS errors
```

### **Full Test:**
1. Login via magic link
2. Click "Scan Now"
3. View opportunity details
4. Click "Track Outcome"
5. Submit a signal outcome

**All steps should work without CORS errors.**

---

## 📚 **Reference Files**

| File | Purpose | Key Setting |
|------|---------|-------------|
| `apps/web/vite.config.ts` | Frontend port config | `server.port: 3000` |
| `apps/api/app/core/config.py` | CORS allowed origins | `ALLOWED_HOSTS` |
| `apps/api/app/main.py` | CORS middleware | `CORSMiddleware` |
| `apps/web/.env.local` | Frontend API URL | `VITE_API_BASE_URL` |

---

## 🚀 **Quick Reference**

### **Current Configuration:**
- **Frontend Port:** 3000 (Vite)
- **Backend Port:** 8000 (FastAPI)
- **CORS Allowed:** `localhost:3000`, `127.0.0.1:3000` (+ others)
- **Auth:** Supabase JWT tokens in request headers

### **Common Commands:**
```bash
# Rebuild backend after CORS changes
docker-compose up -d --build api

# Check backend logs
docker logs alpha-scanner-api --tail 50

# Test CORS directly
curl -H "Origin: http://localhost:3000" http://localhost:8000/api/v1/health
```

---

## ✅ **Commits Applied**

1. `fix(cors): Add port 3000 to ALLOWED_HOSTS for Vite default port`
2. `fix(cors): Add OPTIONS and PATCH methods, expose all headers`

**Result:** CORS works for ports 3000, 3001, and 5173. Future-proofed! 🎉

---

**Last Updated:** October 1, 2025  
**Status:** Production Ready ✅

