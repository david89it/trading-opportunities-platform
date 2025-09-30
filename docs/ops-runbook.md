# Ops Runbook: Alpha Scanner

## Environments & Secrets
- apps/api/.env: DATABASE_URL (Supabase pooler), SUPABASE_URL, SUPABASE_JWT_SECRET, SUPABASE_* keys
- apps/web: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (dev only)
- Never commit service role keys to client code; keep server-only

## CORS
- Configure `ALLOWED_HOSTS` in apps/api/app/core/config.py via env
  - Dev: ["http://127.0.0.1:5173", "http://localhost:5173"]
  - Prod: set to your exact web origins only

## Auth
- Supabase magic link (email) on `/auth`
- API verifies JWT (JWKS first, HS256 fallback via SUPABASE_JWT_SECRET)
- DB-backed endpoints require `Authorization: Bearer <access_token>`

## E2E Validation
1) Web: sign in on `/auth`
2) Dashboard: Save Current List -> Load Recent
3) Verify recent shows your saved rows
4) curl without token -> 401:
```bash
curl -i http://127.0.0.1:8000/api/v1/opportunities/recent
```

## Migrations
- Alembic uses SUPABASE_DB_DIRECT_URL (sslmode=require)
- Create migration: `cd apps/api && poetry run alembic revision -m "msg"`
- Upgrade: `poetry run alembic upgrade head`

## Troubleshooting
- DNS issues: prefer session pooler (IPv4) host
- SSL errors: ensure `sslmode=require` in Supabase URLs
- 401: check token not expired; ensure Authorization header present
