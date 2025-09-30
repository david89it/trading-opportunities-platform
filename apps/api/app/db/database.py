"""
Database engine and session management
"""

from contextlib import contextmanager
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
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
    connect_args=_connect_args,  # must be a dict; leave empty if none
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Async engine and session for FastAPI async endpoints
_async_db_url = (_db_url.replace('postgresql://', 'postgresql+asyncpg://') 
                 if _db_url.startswith('postgresql://') else _db_url)

async_engine = create_async_engine(
    _async_db_url,
    pool_pre_ping=True,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function for FastAPI async endpoints.
    Provides an async database session.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


