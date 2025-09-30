# Alpha Scanner - Asymmetric Trading Analytics Platform

A sophisticated trading analytics platform designed to identify asymmetric risk/reward opportunities in liquid US stocks. The platform provides comprehensive signal analysis, risk management, and performance tracking capabilities.

## 🏗️ Architecture

- **Backend**: FastAPI + Python 3.11 with async patterns
- **Frontend**: React 18 + TypeScript + Vite 6  
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Auth/DB (hosted)**: Supabase (Postgres, Auth JWT, RLS)
- **Cache**: Redis for high-performance data caching
- **Data**: Polygon.io API integration
- **Deployment**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Run Locally (recommended)

1) Install deps
```bash
pnpm install
```

2) Configure environments
- API env at `apps/api/.env` (required)
```
DATABASE_URL="postgresql://<user>:<pass>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
SUPABASE_DB_POOL_URL="postgresql://<user>:<pass>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true"
SUPABASE_DB_DIRECT_URL="postgresql://<user>:<pass>@db.<ref>.supabase.co:5432/postgres?sslmode=require"
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_JWT_SECRET="<from Supabase settings>"
SUPABASE_ANON_KEY="<anon key>"
# Optional
ALLOWED_HOSTS=["http://127.0.0.1:5173","http://localhost:5173"]
USE_POLYGON_LIVE=false
```
- Web env at `apps/web/.env` (dev-only)
```
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon key>"
```

3) Start both services (dev)
```bash
pnpm dev        # runs API (Uvicorn) and Web (Vite) together
```
Web: http://127.0.0.1:5173  ·  API: http://127.0.0.1:8000

4) Sign in and use
- Open http://127.0.0.1:5173/auth, enter your email, click the magic link.
- Go to Dashboard, “Save Current List”, then “Load Recent”. Data is user-scoped via RLS.

5) Quick API checks
```bash
# Health (public)
curl -sS http://127.0.0.1:8000/api/v1/health | jq .

# Protected (should be 401 without token)
curl -i "http://127.0.0.1:8000/api/v1/opportunities/recent?limit=3"
```

### Production Deployment

1. **Clone the repository**:
```bash
git clone <repository-url>
cd Trader
```

2. **Set up environment variables**:
```bash
# Copy and edit envs for API and Web as in the local run section.
# Ensure ALLOWED_HOSTS contains your real web origin(s).
```

3. **Start all services**:
```bash
docker-compose up -d
```

4. **Access the application**:
- Web Dashboard: http(s)://<your-domain>
- API Documentation: http://localhost:8000/docs
- API Health Check: http://localhost:8000/api/v1/health

### Development Setup

1. **Install dependencies**:
```bash
pnpm install
```

2. **Start development services** (Redis & PostgreSQL only):
```bash
docker-compose -f docker-compose.dev.yml up -d redis postgres
```

3. **Start the API server** (Python 3.11):
```bash
cd apps/api
poetry install
poetry run uvicorn app.main:app --reload
```

4. **Start the web development server**:
```bash
cd apps/web
pnpm run dev
```

5. **One-command dev (both)**:
```bash
pnpm dev           # runs API and Web together (uses concurrently)
pnpm dev:api       # API only
pnpm dev:web       # Web only
```

## 📊 Features

### Current (MVP)
- **Signal Scanning**: Automated detection of asymmetric opportunities
- **Risk Analysis**: Probability calculations and expected R calculations
- **Mock Data**: Realistic synthetic trading data for development
- **Web Dashboard**: Clean, responsive interface for opportunity analysis
- **API Integration**: RESTful API with comprehensive documentation

### Planned
- **Live Data Integration**: Real-time market data via Polygon.io
- **Position Sizing**: Intelligent position sizing based on risk parameters
- **Performance Tracking**: Historical signal performance and calibration
- **Alert System**: Configurable notifications for new opportunities
- **Advanced Analytics**: Monte Carlo simulations and backtesting

## 🔧 Development

### Project Structure
```
Trader/
├── apps/
│   ├── api/          # FastAPI backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Shared TypeScript types
├── docker-compose.yml
└── README.md
```

### Key Commands

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm run build

# Run linting
pnpm run lint

# Run tests
pnpm run test

# Docker commands
docker-compose up -d          # Start production
docker-compose -f docker-compose.dev.yml up -d  # Start development
docker-compose down           # Stop services
docker-compose build         # Rebuild images
```

### API Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/opportunities` - List trading opportunities
- `GET /api/v1/opportunities/{symbol}` - Get specific opportunity
 - `POST /api/v1/opportunities/persist` - Compute & persist opportunities (auth required)
 - `GET /api/v1/opportunities/recent` - Read recent (auth required, user-scoped)

## 🛡️ Risk Management

The platform implements strict risk management guardrails:

- **Position Sizing**: Maximum 0.5% risk per trade
- **Heat Limits**: Maximum 2% concurrent open risk
- **Daily Stops**: -2R daily loss limit
- **Streak Protection**: Halt after 8 consecutive losses

## 📈 Data & Compliance

- **Data Source**: Polygon.io for high-quality market data
- **Point-in-Time**: All features use proper time alignment
- **No Lookahead**: Strict prevention of future data leakage
- **Event Awareness**: Earnings, splits, and dividend tracking

## 🎯 Promotion Gates

Before going live, the system must pass:

- **Calibration Gate**: ≤10% absolute calibration error
- **Expectancy Gate**: >+0.1R/trade over 300+ trades
- **Monte Carlo Gate**: >40% P(2× in 1y), <20% P95 max drawdown

## 🚨 Disclaimer

This platform is for educational and research purposes only. It does not provide financial advice. Always consult with qualified financial professionals before making investment decisions.

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests for any improvements.

---

Built with ❤️ for systematic trading research