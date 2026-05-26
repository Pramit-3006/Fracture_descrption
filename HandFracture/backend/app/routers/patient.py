import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from backend.app.database import get_db
from backend.app.models import Patient, Scan, AuditLog
from backend.app.schemas import PatientResponse, PatientCreate, ScanResponse
from backend.app.routers.auth import get_current_user, User
from backend.app.core.dicom_parser import DicomParser

router = APIRouter(prefix="/patients", tags=["Patient & Scans"])

# Upload directory configuration
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_pat = db.query(Patient).filter(Patient.id == patient.id).first()
    if db_pat:
        raise HTTPException(status_code=400, detail="Patient with this hospital ID already exists.")
    
    new_pat = Patient(
        id=patient.id,
        name=patient.name,
        dob=patient.dob,
        gender=patient.gender
    )
    db.add(new_pat)
    
    # Audit log
    db.add(AuditLog(user_id=current_user.username, action="CREATE_PATIENT", resource_id=patient.id))
    db.commit()
    db.refresh(new_pat)
    return new_pat

@router.get("/", response_model=List[PatientResponse])
def list_patients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Patient).all()

@router.post("/upload-scan", response_model=ScanResponse)
async def upload_scan(
    patient_id: str = Form(...),
    scan_type: str = Form(...), # ARM, WRIST, SPINE, etc.
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        # Create a mock patient automatically to save user steps during testing
        patient = Patient(
            id=patient_id,
            name=f"Patient {patient_id[-5:] if len(patient_id) > 5 else patient_id}",
            dob=date(1990, 5, 20),
            gender="M"
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    if not file_ext:
        file_ext = ".dcm" # Default DICOM
        
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Read bytes
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    # Parse DICOM tags
    parsed_metadata = DicomParser.parse_file(content)
    
    # Generate serving URL path
    image_url = f"/static/uploads/{unique_filename}"
    
    new_scan = Scan(
        id=f"scan_{uuid.uuid4().hex[:10]}",
        patient_id=patient_id,
        scan_type=scan_type.upper(),
        image_url=image_url,
        dicom_metadata=parsed_metadata
    )
    db.add(new_scan)
    
    # Audit log
    db.add(AuditLog(user_id=current_user.username, action="UPLOAD_SCAN", resource_id=new_scan.id))
    db.commit()
    db.refresh(new_scan)
    return new_scan

@router.get("/scans", response_model=List[ScanResponse])
def list_scans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Scan).all()
