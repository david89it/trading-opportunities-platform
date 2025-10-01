# 🚀 Alpha Scanner - Quick Start Guide

**Last Updated:** October 1, 2025

---

## ✅ **Recommended Setup (What You're Using)**

### **Start the App**

**Terminal 1 - Backend (Docker):**
```bash
# Start all backend services (API, Database, Redis)
docker-compose up -d

# View logs (optional)
docker-compose logs -f api

# Check status
docker-compose ps
```

**Terminal 2 - Frontend:**
```bash
# Start the web development server
cd apps/web
pnpm dev
```

### **Access the App**
- **Web Dashboard**: http://localhost:3001
- **API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/api/v1/health

---

## 🛑 **Stop the App**

```bash
# Stop frontend: Press Ctrl+C in the terminal running pnpm dev

# Stop backend:
docker-compose down
```

---

## 🔄 **Rebuild After Code Changes**

### **Backend (API) Changes:**
```bash
docker-compose up -d --build api
```

### **Frontend Changes:**
The dev server (pnpm dev) auto-reloads - no rebuild needed! ✨

---

## 🐛 **Troubleshooting**

### **"Can't connect to API" or "Failed to load opportunities"**

1. **Check if API is running:**
   ```bash
   curl http://localhost:8000/api/v1/health
   ```
   
   Should return:
   ```json
   {
     "status": "healthy",
     "database_connected": true,
     "redis_connected": true
   }
   ```

2. **Check if frontend .env.local exists:**
   ```bash
   cat apps/web/.env.local
   ```
   
   Should contain:
   ```
   VITE_SUPABASE_URL=https://qabcxhiwymvswixgumxw.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_USE_MOCK_API=false
   ```

3. **Restart both frontend and backend:**
   ```bash
   # Stop frontend (Ctrl+C), then:
   docker-compose restart api
   cd apps/web && pnpm dev
   ```

### **"poetry: command not found" when running `pnpm dev`**

**Solution:** Don't use `pnpm dev` from the root! Use Docker instead (see above).

The root `pnpm dev` requires Poetry installed locally, which you don't need since you're using Docker.

---

## ⚙️ **Configuration Files**

### **Backend Environment** (`apps/api/.env`)
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
SUPABASE_DB_POOL_URL=postgresql://...
SUPABASE_DB_DIRECT_URL=postgresql://...

# Auth
SUPABASE_URL=https://qabcxhiwymvswixgumxw.supabase.co
SUPABASE_JWT_SECRET=...
SUPABASE_ANON_KEY=...

# Polygon API
POLYGON_API_KEY=7u5Lxr5JmjaOa59id2g2Hf8o3OH_7oep
USE_POLYGON_LIVE=true
```

### **Frontend Environment** (`apps/web/.env.local`)
```env
VITE_SUPABASE_URL=https://qabcxhiwymvswixgumxw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK_API=false
```

---

## 📊 **Common Tasks**

### **View API Logs**
```bash
docker-compose logs -f api
```

### **View Database Logs**
```bash
docker-compose logs -f postgres
```

### **Clear Cache and Restart**
```bash
docker-compose down
docker-compose up -d --build
```

### **Access Database Directly**
```bash
docker exec -it alpha-scanner-postgres psql -U postgres -d app
```

### **Access Redis CLI**
```bash
docker exec -it alpha-scanner-redis redis-cli
```

---

## 🧪 **Testing the Scanner**

1. **Open the dashboard**: http://localhost:3001
2. **Sign in** with your email (magic link)
3. **Click "Scan Now"** button
4. **Wait ~2 minutes** for initial scan (or instant if cached)
5. **View opportunities** with real market data!

---

## 📚 **Documentation**

- **Scanner Strategy**: [SCANNER_STRATEGY.md](./SCANNER_STRATEGY.md)
- **Free Tier Guide**: [FREE_TIER_GUIDE.md](./FREE_TIER_GUIDE.md)
- **Price Fix Summary**: [PRICE_FIX_SUMMARY.md](./PRICE_FIX_SUMMARY.md)
- **PRD Refinements**: [PRD_refinements.md](./PRD_refinements.md)

---

## ❓ **Why Not Use `pnpm dev` from Root?**

The root `pnpm dev` command is designed for **local development without Docker**, which requires:
- ✅ Poetry installed (Python package manager)
- ✅ Local PostgreSQL running on port 5433
- ✅ Local Redis running on port 6379
- ✅ Manual environment setup

**Your Docker setup is simpler and more reliable!** It handles all dependencies automatically.

---

## 🎯 **Development Workflow**

### **Daily Workflow:**
```bash
# Morning:
docker-compose up -d              # Start backend
cd apps/web && pnpm dev          # Start frontend (new terminal)

# During development:
# - Frontend auto-reloads on file changes ✨
# - Backend requires rebuild: docker-compose up -d --build api

# Evening:
# - Ctrl+C to stop frontend
# - docker-compose down to stop backend
```

### **Making Changes:**

**Frontend code changes:**
- Just save the file → auto-reload ✨

**Backend code changes:**
```bash
docker-compose up -d --build api
```

**Database schema changes:**
1. Update Alembic migration or run SQL in Supabase
2. Restart API: `docker-compose restart api`

---

**That's it! Happy trading! 🚀**

