# FastAPI & Pydantic Reference

This document contains FastAPI patterns, Pydantic schemas, and backend implementation notes for the Alpha Scanner project.

## FastAPI Project Structure

```
apps/api/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app instance
│   ├── core/
│   │   ├── config.py        # Settings and configuration
│   │   └── deps.py          # Dependencies
│   ├── models/              # Pydantic models
│   │   ├── opportunities.py
│   │   ├── risk.py
│   │   └── trades.py
│   ├── routers/             # API route handlers
│   │   ├── health.py
│   │   ├── opportunities.py
│   │   ├── risk.py
│   │   └── trades.py
│   ├── services/            # Business logic
│   │   ├── polygon_client.py
│   │   ├── scanner.py
│   │   └── risk_calculator.py
│   └── db/                  # Database models and sessions
│       ├── models.py
│       └── session.py
├── tests/
└── pyproject.toml
```

## FastAPI Application Setup

### Main Application

```python
# apps/api/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.routers import health, opportunities, risk

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("🚀 Alpha Scanner API starting up...")
    yield
    # Shutdown logic
    print("📡 Alpha Scanner API shutting down...")

app = FastAPI(
    title="Alpha Scanner API",
    description="Asymmetric Alpha Scanner & Analytics Platform",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(opportunities.router, prefix="/api/v1", tags=["opportunities"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["risk"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
```

### Configuration Management

```python
# apps/api/app/core/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Alpha Scanner API"
    DEBUG: bool = False
    
    # API Keys
    POLYGON_API_KEY: Optional[str] = None
    USE_POLYGON_LIVE: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/alpha_scanner"
    
    # Cache
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
    ]
    
    # Risk Management
    RISK_PCT_PER_TRADE: float = 0.005
    MAX_HEAT_PCT: float = 0.02
    DAILY_STOP_R: float = -2.0
    LOSS_STREAK_HALT: int = 8
    
    # Timezone
    TZ: str = "UTC"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

## Pydantic Models

### Core Opportunity Model

```python
# apps/api/app/models/opportunities.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class GuardrailStatus(str, Enum):
    APPROVED = "approved"
    BLOCKED = "blocked"
    REVIEW = "review"

class FeatureScores(BaseModel):
    price_score: float = Field(..., ge=0, le=10, description="Price action score (0-10)")
    volume_score: float = Field(..., ge=0, le=10, description="Volume profile score (0-10)")
    volatility_score: float = Field(..., ge=0, le=10, description="Volatility score (0-10)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "price_score": 8.5,
                "volume_score": 7.2,
                "volatility_score": 6.8
            }
        }

class TradeSetup(BaseModel):
    entry_price: float = Field(..., gt=0, description="Entry price per share")
    stop_loss: float = Field(..., gt=0, description="Stop loss price per share") 
    target_1: float = Field(..., gt=0, description="First target price")
    target_2: Optional[float] = Field(None, gt=0, description="Second target price")
    position_size_usd: float = Field(..., gt=0, description="Position size in USD")
    position_size_shares: int = Field(..., gt=0, description="Position size in shares")
    rr_ratio: float = Field(..., gt=0, description="Risk-reward ratio")
    
    @validator('stop_loss')
    def stop_loss_below_entry(cls, v, values):
        if 'entry_price' in values and v >= values['entry_price']:
            raise ValueError('Stop loss must be below entry price')
        return v
    
    @validator('target_1')
    def target_above_entry(cls, v, values):
        if 'entry_price' in values and v <= values['entry_price']:
            raise ValueError('Target must be above entry price')
        return v

class Opportunity(BaseModel):
    symbol: str = Field(..., description="Stock ticker symbol")
    timestamp: datetime = Field(..., description="Signal generation timestamp")
    signal_score: float = Field(..., ge=0, le=10, description="Overall signal strength (0-10)")
    
    # Feature breakdown
    features: FeatureScores
    
    # Trade setup
    setup: TradeSetup
    
    # Probability estimates
    p_target: float = Field(..., ge=0, le=1, description="Probability of hitting target before stop")
    net_expected_r: float = Field(..., description="Net expected R after costs")
    costs_r: float = Field(..., ge=0, description="Estimated costs in R units")
    
    # Risk management
    guardrail_status: GuardrailStatus = Field(..., description="Risk system approval status")
    
    # Market data context
    current_price: float = Field(..., gt=0, description="Current market price")
    volume_rvol: float = Field(..., gt=0, description="Relative volume vs 20-day average")
    atr_percent: float = Field(..., gt=0, description="ATR as percentage of price")
    
    # Metadata
    features_json: Dict[str, Any] = Field(default_factory=dict, description="Raw feature data")
    version: str = Field(default="1.0", description="Feature schema version")
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "AAPL",
                "timestamp": "2024-01-04T14:30:00Z",
                "signal_score": 8.5,
                "features": {
                    "price_score": 8.5,
                    "volume_score": 7.2,
                    "volatility_score": 6.8
                },
                "setup": {
                    "entry_price": 185.50,
                    "stop_loss": 182.75,
                    "target_1": 192.00,
                    "target_2": 196.50,
                    "position_size_usd": 1000,
                    "position_size_shares": 5,
                    "rr_ratio": 2.36
                },
                "p_target": 0.45,
                "net_expected_r": 0.15,
                "costs_r": 0.05,
                "guardrail_status": "approved",
                "current_price": 185.25,
                "volume_rvol": 1.8,
                "atr_percent": 2.1,
                "version": "1.0"
            }
        }
```

### API Response Models

```python
# Response wrapper models
class OpportunitiesResponse(BaseModel):
    opportunities: List[Opportunity]
    total: int = Field(..., description="Total opportunities available")
    limit: int = Field(..., description="Number requested in this page")
    offset: int = Field(0, description="Number skipped (pagination)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
class HealthResponse(BaseModel):
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = "0.1.0"
    services: Dict[str, str] = Field(default_factory=dict)
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "timestamp": "2024-01-04T14:30:00Z",
                "version": "0.1.0",
                "services": {
                    "database": "connected",
                    "cache": "connected",
                    "polygon": "connected"
                }
            }
        }
```

### Risk Models

```python
# apps/api/app/models/risk.py
from pydantic import BaseModel, Field
from typing import List

class MonteCarloParams(BaseModel):
    p_win: float = Field(..., ge=0, le=1, description="Win probability")
    r_win: float = Field(..., gt=0, description="Risk-reward ratio for wins")
    risk_pct: float = Field(..., gt=0, le=0.1, description="Risk per trade as decimal")
    trades_per_week: int = Field(..., gt=0, le=100, description="Number of trades per week")
    weeks: int = Field(..., gt=0, le=260, description="Number of weeks to simulate")
    cost_per_trade_usd: float = Field(1.0, ge=0, description="Fixed cost per trade")
    slippage_bps: float = Field(10.0, ge=0, description="Slippage in basis points")
    starting_capital: float = Field(10000.0, gt=0, description="Starting capital in USD")
    num_simulations: int = Field(1000, gt=0, le=10000, description="Number of Monte Carlo runs")

class MonteCarloResult(BaseModel):
    # Input parameters
    parameters: MonteCarloParams
    
    # Results
    final_equity_distribution: List[float] = Field(..., description="Final equity values from all simulations")
    sample_equity_paths: List[List[float]] = Field(..., description="Sample equity curve paths")
    
    # Statistics
    mean_final_equity: float = Field(..., description="Mean final equity across simulations")
    median_final_equity: float = Field(..., description="Median final equity")
    
    # Risk Metrics
    risk_metrics: Dict[str, float] = Field(..., description="Risk and performance metrics")
    
    class Config:
        json_schema_extra = {
            "example": {
                "parameters": {
                    "p_win": 0.45,
                    "r_win": 2.5,
                    "risk_pct": 0.005,
                    "trades_per_week": 10,
                    "weeks": 52,
                    "num_simulations": 1000
                },
                "mean_final_equity": 15750.50,
                "median_final_equity": 14200.25,
                "risk_metrics": {
                    "p95_max_drawdown": -0.18,
                    "prob_2x": 0.42,
                    "prob_3x": 0.15,
                    "sharpe_ratio": 1.35,
                    "profit_factor": 1.28
                }
            }
        }
```

## API Route Patterns

### Health Check Router

```python
# apps/api/app/routers/health.py
from fastapi import APIRouter, Depends
from app.models.opportunities import HealthResponse
from app.core.deps import get_db, get_redis

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check(
    db=Depends(get_db),
    redis=Depends(get_redis)
):
    """System health check endpoint"""
    services = {}
    
    # Check database
    try:
        await db.execute("SELECT 1")
        services["database"] = "connected"
    except Exception:
        services["database"] = "error"
    
    # Check Redis
    try:
        await redis.ping()
        services["cache"] = "connected"  
    except Exception:
        services["cache"] = "error"
    
    # Check Polygon API (if enabled)
    if settings.USE_POLYGON_LIVE and settings.POLYGON_API_KEY:
        try:
            # Simple API test
            services["polygon"] = "connected"
        except Exception:
            services["polygon"] = "error"
    else:
        services["polygon"] = "disabled"
    
    return HealthResponse(services=services)
```

### Opportunities Router

```python
# apps/api/app/routers/opportunities.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.models.opportunities import Opportunity, OpportunitiesResponse
from app.services.scanner import get_opportunities, get_opportunity_by_symbol

router = APIRouter()

@router.get("/opportunities", response_model=OpportunitiesResponse)
async def list_opportunities(
    limit: int = Query(50, ge=1, le=500, description="Number of opportunities to return"),
    offset: int = Query(0, ge=0, description="Number of opportunities to skip"),
    min_score: Optional[float] = Query(None, ge=0, le=10, description="Minimum signal score"),
    status: Optional[str] = Query(None, description="Filter by guardrail status"),
):
    """Get list of current trading opportunities"""
    opportunities = await get_opportunities(
        limit=limit,
        offset=offset,
        min_score=min_score,
        status=status
    )
    
    return OpportunitiesResponse(
        opportunities=opportunities,
        total=len(opportunities),  # In real implementation, get actual total
        limit=limit,
        offset=offset
    )

@router.get("/opportunities/{symbol}", response_model=Opportunity)
async def get_opportunity(symbol: str):
    """Get detailed opportunity data for a specific symbol"""
    opportunity = await get_opportunity_by_symbol(symbol.upper())
    
    if not opportunity:
        raise HTTPException(
            status_code=404,
            detail=f"Opportunity not found for symbol: {symbol}"
        )
    
    return opportunity
```

## Database Integration (SQLAlchemy)

### Database Models

```python
# apps/api/app/db/models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class OpportunityDB(Base):
    __tablename__ = "opportunities"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(10), index=True, nullable=False)
    timestamp = Column(DateTime, server_default=func.now(), nullable=False)
    signal_score = Column(Float, nullable=False)
    
    # Scores
    price_score = Column(Float, nullable=False)
    volume_score = Column(Float, nullable=False)
    volatility_score = Column(Float, nullable=False)
    
    # Trade setup
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    target_1 = Column(Float, nullable=False)
    target_2 = Column(Float, nullable=True)
    position_size_usd = Column(Float, nullable=False)
    position_size_shares = Column(Integer, nullable=False)
    rr_ratio = Column(Float, nullable=False)
    
    # Probabilities
    p_target = Column(Float, nullable=False)
    net_expected_r = Column(Float, nullable=False)
    costs_r = Column(Float, nullable=False)
    
    # Status
    guardrail_status = Column(String(20), nullable=False, default="review")
    
    # Market context
    current_price = Column(Float, nullable=False)
    volume_rvol = Column(Float, nullable=False)
    atr_percent = Column(Float, nullable=False)
    
    # Metadata
    features = Column(JSON, nullable=False, default=dict)
    version = Column(String(10), nullable=False, default="1.0")
    
    # Indexes
    __table_args__ = (
        {"mysql_engine": "InnoDB"}
    )
```

## Error Handling

### Custom Exceptions

```python
# apps/api/app/core/exceptions.py
from fastapi import HTTPException

class AlphaScannerException(Exception):
    """Base exception for Alpha Scanner"""
    pass

class PolygonAPIException(AlphaScannerException):
    """Polygon.io API related errors"""
    pass

class ScannerException(AlphaScannerException):
    """Signal scanning related errors"""
    pass

class GuardrailException(AlphaScannerException):
    """Risk guardrail violations"""
    pass

# Exception handlers
from fastapi import Request
from fastapi.responses import JSONResponse

async def alpha_scanner_exception_handler(request: Request, exc: AlphaScannerException):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Alpha Scanner Error",
            "detail": str(exc),
            "request_id": request.headers.get("x-request-id")
        }
    )
```

## Testing Patterns

### Test Client Setup

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_opportunity():
    return {
        "symbol": "AAPL",
        "signal_score": 8.5,
        "features": {
            "price_score": 8.5,
            "volume_score": 7.2,
            "volatility_score": 6.8
        },
        "setup": {
            "entry_price": 185.50,
            "stop_loss": 182.75,
            "target_1": 192.00,
            "position_size_usd": 1000,
            "position_size_shares": 5,
            "rr_ratio": 2.36
        },
        "p_target": 0.45,
        "net_expected_r": 0.15,
        "costs_r": 0.05,
        "guardrail_status": "approved",
        "current_price": 185.25,
        "volume_rvol": 1.8,
        "atr_percent": 2.1
    }
```

### API Tests

```python
# tests/test_opportunities.py
def test_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
    assert "services" in data

def test_list_opportunities(client):
    response = client.get("/api/v1/opportunities")
    assert response.status_code == 200
    data = response.json()
    assert "opportunities" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data

def test_get_opportunity_not_found(client):
    response = client.get("/api/v1/opportunities/INVALID")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
```

## Deployment Configuration

### Docker Setup

```dockerfile
# apps/api/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev

# Copy application
COPY app/ ./app/

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com/
- **Pydantic Documentation**: https://docs.pydantic.dev/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **Uvicorn Documentation**: https://www.uvicorn.org/

---

**Last Updated**: 2025-01-04  
**FastAPI Version**: 0.104.1, **Pydantic Version**: 2.5.0