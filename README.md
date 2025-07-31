# Alpha Scanner - Asymmetric Trading Analytics Platform

A sophisticated trading analytics platform designed to identify asymmetric risk/reward opportunities in liquid US stocks. The platform provides comprehensive signal analysis, risk management, and performance tracking capabilities.

## 🏗️ Architecture

- **Backend**: FastAPI + Python 3.11 with async patterns
- **Frontend**: React 18 + TypeScript + Vite 6  
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Cache**: Redis for high-performance data caching
- **Data**: Polygon.io API integration
- **Deployment**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Production Deployment

1. **Clone the repository**:
```bash
git clone <repository-url>
cd Trader
```

2. **Set up environment variables**:
```bash
cp env.example .env
# Edit .env with your Polygon.io API key and other settings
```

3. **Start all services**:
```bash
docker-compose up -d
```

4. **Access the application**:
- Web Dashboard: http://localhost:3000
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

3. **Start the API server**:
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