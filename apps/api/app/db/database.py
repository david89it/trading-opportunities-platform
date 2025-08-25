"""
Database engine and session management
"""

from contextlib import contextmanager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


# Synchronous engine for simplicity (sufficient for MVP)
# Prefer Supabase pooled URL at runtime if provided; fallback to DATABASE_URL
_db_url = settings.SUPABASE_DB_POOL_URL or settings.DATABASE_URL

# Optional SSL connect args (psyсopg2)
_connect_args = {}
if settings.DB_SSLMODE:
    _connect_args["sslmode"] = settings.DB_SSLMODE
if settings.DB_SSLROOTCERT:
    _connect_args["sslrootcert"] = settings.DB_SSLROOTCERT
if settings.DB_SSLCERT:
    _connect_args["sslcert"] = settings.DB_SSLCERT
if settings.DB_SSLKEY:
    _connect_args["sslkey"] = settings.DB_SSLKEY

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    future=True,
    connect_args=_connect_args or None,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


