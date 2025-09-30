# Alpha Scanner API

FastAPI backend for the Alpha Scanner trading analytics platform.

## Quick Start

```bash
# Install dependencies
poetry install

# Run migrations
alembic upgrade head

# Start the API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

- **Health**: `GET /api/v1/health`
- **Opportunities**: `GET /api/v1/opportunities`
- **Risk Analysis**: `POST /api/v1/risk/monte-carlo`
- **Signal Tracking**: `POST /api/v1/tracking/signals`
- **Trade Journal**: `POST /api/v1/tracking/trades`
- **Calibration**: `GET /api/v1/tracking/calibration`