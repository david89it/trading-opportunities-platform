"""
Application Configuration
"""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )
    
    # API Configuration
    API_HOST: str = Field(default="0.0.0.0", description="API host")
    API_PORT: int = Field(default=8000, description="API port")
    API_WORKERS: int = Field(default=1, description="Number of API workers")
    DEBUG: bool = Field(default=True, description="Debug mode")
    
    # CORS Configuration
    ALLOWED_HOSTS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins"
    )
    
    # Database Configuration
    DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/app",
        description="Database connection URL"
    )
    
    # Redis Configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    
    # Polygon.io API Configuration
    POLYGON_API_KEY: str = Field(default="", description="Polygon.io API key")
    USE_POLYGON_LIVE: bool = Field(
        default=False, 
        description="Use live Polygon.io data (false = use fixtures)"
    )
    
    # Risk Management Parameters
    RISK_PCT_PER_TRADE: float = Field(
        default=0.005, 
        ge=0.0001, 
        le=0.05,
        description="Risk per trade as percentage (e.g., 0.005 = 0.5%)"
    )
    MAX_HEAT_PCT: float = Field(
        default=0.02, 
        ge=0.001, 
        le=0.20,
        description="Maximum concurrent open risk percentage"
    )
    DAILY_STOP_R: float = Field(
        default=-2.0, 
        le=0.0,
        description="Daily stop loss in R units"
    )
    LOSS_STREAK_HALT: int = Field(
        default=8, 
        ge=1,
        description="Halt trading after N consecutive losses"
    )
    
    # Timezone
    TZ: str = Field(default="UTC", description="Application timezone")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")
    
    # Config moved to model_config for Pydantic v2 compatibility


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings instance"""
    return settings