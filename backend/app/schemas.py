from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import date, datetime

# Auth Schemas
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    role: str = "RADIOLOGIST" # RADIOLOGIST, TECHNICIAN, RESEARCHER, ADMIN

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# Patient Schemas
class PatientCreate(BaseModel):
    id: str
    name: str
    dob: date
    gender: str

class PatientResponse(BaseModel):
    id: str
    name: str
    dob: date
    gender: str
    created_at: datetime

    class Config:
        from_attributes = True

# Scan & DICOM Metadata Schemas
class ScanCreate(BaseModel):
    patient_id: str
    scan_type: str  # ARM, WRIST, ELBOW, SHOULDER, FEMUR, KNEE, TIBIA, PELVIS, SPINE, SKULL, ANKLE, FOOT etc.
    image_url: str
    dicom_metadata: Optional[Dict[str, Any]] = None

class ScanResponse(BaseModel):
    id: str
    patient_id: str
    scan_type: str
    image_url: str
    dicom_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Bounding Box / Segment Mask
class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: str
    confidence: float

class SegmentationPoint(BaseModel):
    x: float
    y: float

# Bone Deformity Metrics
class DeformityMetrics(BaseModel):
    angular_deformity_deg: float = Field(..., description="Angle deviation from anatomical normal in degrees")
    displacement_mm: float = Field(..., description="Fragment displacement distance in mm")
    fracture_gap_mm: float = Field(..., description="Gap distance between bone fragments in mm")
    cortical_disruption_pct: float = Field(..., description="Breached cortex circumference percentage")
    fracture_length_mm: float = Field(..., description="Length of the fracture split in mm")

# Model Specific Benchmark Output
class ModelOutput(BaseModel):
    model_name: str
    confidence: float
    inference_time_ms: float
    bounding_boxes: List[BoundingBox]
    segmentation_mask: List[List[float]] = [] # Contour polygon coordinates
    gcam_overlay_url: Optional[str] = None

# Explainable AI (XAI) Details
class XaiMetrics(BaseModel):
    gcam_url: str
    scorecam_url: str
    lime_explanation: str
    shap_explanation: str
    attention_hotspots: List[Dict[str, Any]]

# Human-vs-AI Comparison Metrics
class BenchmarkMetrics(BaseModel):
    dice_coefficient: float
    iou: float
    precision: float
    recall: float
    f1_score: float
    accuracy: float
    sensitivity: float
    specificity: float

# Full Analysis Response
class AnalysisResponse(BaseModel):
    scan_id: str
    fracture_detected: bool
    detected_type: str # Transverse, Oblique, Comminuted, Greenstick, Hairline, None
    affected_bone: str
    overall_confidence: float
    ensemble_agreement: float
    deformity: DeformityMetrics
    models_benchmark: List[ModelOutput]
    comparison_metrics: Optional[BenchmarkMetrics] = None
    xai: XaiMetrics
    enhanced_image_url: str
    processed_at: datetime

# Clinical Report Schemas
class ReportCreate(BaseModel):
    scan_id: str
    clinical_notes: str
    urgency_level: str  # LOW, MEDIUM, HIGH, EMERGENCY

class ReportResponse(BaseModel):
    id: str
    scan_id: str
    fracture_detected: bool
    fracture_type: Optional[str] = None
    severity_score: float
    displacement_mm: float
    angular_deformity_deg: float
    urgency_level: str
    ai_confidence: float
    ensemble_agreement: float
    clinical_notes: str
    created_by: str
    created_at: datetime

    class Config:
        from_attributes = True
