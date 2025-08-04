# API Documentation References

This document contains links to official documentation for all APIs and libraries used in the Alpha Scanner project. Local copies and notes are maintained for offline development.

## Core Development Stack

### Backend (Python/FastAPI)
- **FastAPI Framework**: https://fastapi.tiangolo.com/
  - Tutorial: https://fastapi.tiangolo.com/tutorial/
  - API Reference: https://fastapi.tiangolo.com/reference/
  - Local notes: [fastapi-refs.md](./fastapi-refs.md)

- **Pydantic**: https://docs.pydantic.dev/
  - Data validation and settings management
  - Local notes: [fastapi-refs.md](./fastapi-refs.md) (includes Pydantic patterns)

### Frontend (React/TypeScript)
- **React 18**: https://react.dev/
  - Learn React: https://react.dev/learn
  - API Reference: https://react.dev/reference/react

- **TanStack Query v5**: https://tanstack.com/query/latest/docs/framework/react/overview
  - Installation: https://tanstack.com/query/latest/docs/framework/react/installation
  - API Reference: https://tanstack.com/query/latest/docs/framework/react/reference/useQuery
  - Local notes: [react-query-refs.md](./react-query-refs.md)

- **TypeScript**: https://www.typescriptlang.org/docs/
  - Handbook: https://www.typescriptlang.org/docs/handbook/intro.html

### Charting Libraries
- **TradingView Lightweight Charts v5.0**: https://tradingview.github.io/lightweight-charts/docs
  - Getting Started: https://tradingview.github.io/lightweight-charts/docs/getting-started
  - API Reference: https://tradingview.github.io/lightweight-charts/docs/api
  - License/Attribution: https://tradingview.github.io/lightweight-charts/docs/licensing
  - **⚠️ ATTRIBUTION REQUIRED**: Must display TradingView attribution and link to tradingview.com
  - Local notes: [charting-refs.md](./charting-refs.md)

- **Chart.js**: https://www.chartjs.org/docs/latest/
  - Getting Started: https://www.chartjs.org/docs/latest/getting-started/
  - Local notes: [charting-refs.md](./charting-refs.md)

## Market Data & External APIs

### Polygon.io Market Data
- **Full Market Snapshot**: https://polygon.io/docs/rest/stocks/snapshots/full-market-snapshot
- **Single Ticker Snapshot**: https://polygon.io/docs/rest/stocks/snapshots/single-ticker-snapshot
- **Aggregates (Custom Bars)**: https://polygon.io/docs/rest/stocks/aggregates/custom-bars
- **Ticker Overview**: https://polygon.io/docs/rest/stocks/tickers/ticker-overview
- **WebSocket Quickstart**: https://polygon.io/docs/websocket/quickstart
- Local notes: [polygon-refs.md](./polygon-refs.md)

## Design System

### Visa Product Design System
- **VPDS Home**: https://design.visa.com/
- **Getting Started**: https://design.visa.com/designing/
- Local notes: [vds-refs.md](./vds-refs.md)

## Development Tools

### Build & Development
- **Vite**: https://vitejs.dev/guide/
- **pnpm**: https://pnpm.io/motivation
- **Docker**: https://docs.docker.com/get-started/

### Testing & Quality
- **Jest**: https://jestjs.io/docs/getting-started
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Playwright**: https://playwright.dev/docs/intro

## Local Documentation Files

1. [polygon-refs.md](./polygon-refs.md) - Polygon.io endpoint details and sample responses
2. [charting-refs.md](./charting-refs.md) - TradingView Lightweight Charts integration guide
3. [vds-refs.md](./vds-refs.md) - Visa Design System components and tokens
4. [fastapi-refs.md](./fastapi-refs.md) - FastAPI patterns and Pydantic schemas
5. [react-query-refs.md](./react-query-refs.md) - TanStack Query patterns and hooks

## Sample Data & Fixtures

Test fixtures are stored in `tests/fixtures/` directory:
- `tests/fixtures/polygon/` - Sample Polygon.io API responses
- `tests/fixtures/opportunities/` - Mock trading opportunity data
- `tests/fixtures/market_data/` - Sample market snapshot data

## Offline Development

All critical API documentation has been extracted and saved locally. The project can be developed offline using:
- Local documentation files
- Sample JSON fixtures
- Mock data generators
- `USE_POLYGON_LIVE=false` environment variable

## Last Updated

This documentation was last updated on: **2025-01-04**

**Note**: Always verify current API versions and documentation links before production deployment.