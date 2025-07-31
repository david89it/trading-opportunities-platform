# Alpha Scanner API

FastAPI backend for the Asymmetric Alpha Scanner & Analytics Platform.

## Setup

1. Install dependencies:
```bash
poetry install
```

2. Start the development server:
```bash
poetry run uvicorn app.main:app --reload
```

## API Documentation

When running in development mode, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

Copy `env.example` to `.env` and configure the required variables.