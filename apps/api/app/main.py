"""
Alpha Scanner API - FastAPI Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.routers import health, opportunities, risk

# Create FastAPI app instance
app = FastAPI(
    title="Alpha Scanner API",
    description="Asymmetric Alpha Scanner & Analytics Platform API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(opportunities.router, prefix="/api/v1", tags=["opportunities"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["risk"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    if settings.DEBUG:
        # In development, show the full error
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "detail": str(exc),
                "type": type(exc).__name__,
            }
        )
    else:
        # In production, hide error details
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error"}
        )

# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint returning API information"""
    return {
        "name": "Alpha Scanner API",
        "version": "0.1.0",
        "description": "Asymmetric Alpha Scanner & Analytics Platform",
        "docs_url": "/docs" if settings.DEBUG else None,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.API_WORKERS,
    )

