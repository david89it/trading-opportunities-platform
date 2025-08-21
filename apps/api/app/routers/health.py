"""
Health Check Router
"""

from datetime import datetime, UTC
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    timestamp: datetime
    version: str
    environment: str
    database_connected: bool = False
    redis_connected: bool = False


async def check_database() -> bool:
    """Check database connectivity"""
    # TODO: Implement actual database check
    return True


async def check_redis() -> bool:
    """Check Redis connectivity"""
    # TODO: Implement actual Redis check
    return True


@router.get("/health", response_model=HealthResponse)
async def health_check(
    db_status: bool = Depends(check_database),
    redis_status: bool = Depends(check_redis)
):
    """
    Health check endpoint
    
    Returns the current status of the API and its dependencies.
    """
    return HealthResponse(
        status="healthy" if db_status and redis_status else "degraded",
        timestamp=datetime.now(UTC),
        version="0.1.0",
        environment="development" if settings.DEBUG else "production",
        database_connected=db_status,
        redis_connected=redis_status,
    )


@router.get("/health/ready")
async def readiness_check():
    """
    Kubernetes readiness probe endpoint
    
    Returns 200 if the service is ready to accept traffic.
    """
    return {"status": "ready"}


@router.get("/health/live")
async def liveness_check():
    """
    Kubernetes liveness probe endpoint
    
    Returns 200 if the service is alive.
    """
    return {"status": "alive"}