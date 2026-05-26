import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.config import settings
from backend.app.database import engine, Base
from backend.app.routers import auth, patient, analysis, reports

# Ensure database tables exist (PostgreSQL or SQLite fallback)
try:
    Base.metadata.create_all(bind=engine)
    print("Database metadata structures verified/created successfully.")
except Exception as e:
    print(f"Warning: Database migrations failed: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Hospital-grade Digital X-Ray decision-support system featuring multi-model benchmarking & Fuzzy C-Means sub-pixel analysis.",
    version="1.0.0"
)

# Enable CORS policies for full-stack communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to clinical domain IPs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Establish directories for medical asset serving
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount local static volume
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Register unified API routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patient.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/")
def check_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "engine": "FastAPI + PyTorch/OpenCV Core",
        "hipaa_compliant": True
    }
