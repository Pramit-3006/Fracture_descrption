import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "OsteoInsight Enterprise AI Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database connections
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "osteoinsight")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = "osteoinsight"
    
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # Clinical Defaults
    DEFAULT_CALIBRATION_MM_PER_PIXEL: float = 0.139  # Standard high-res digital radiography pixel pitch
    
    # Clinical Urgency Thresholds
    EMERGENCY_DISPLACEMENT_MM: float = 5.0
    EMERGENCY_ANGULAR_DEFORMITY_DEG: float = 15.0
    HIGH_DISPLACEMENT_MM: float = 2.0
    HIGH_ANGULAR_DEFORMITY_DEG: float = 5.0

    class Config:
        case_sensitive = True

settings = Settings()
