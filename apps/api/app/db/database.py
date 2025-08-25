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
engine = create_engine(_db_url, pool_pre_ping=True, future=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


