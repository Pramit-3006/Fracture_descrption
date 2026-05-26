from sqlalchemy import Column, String, Date, DateTime, Boolean, Float, Text, Integer, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class User(Base):
    __tablename__ = "users"

    username = Column(String(50), primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(100), nullable=False)
    role = Column(String(20), default="RADIOLOGIST") # RADIOLOGIST, TECHNICIAN, RESEARCHER, ADMIN
    created_at = Column(DateTime, default=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    dob = Column(Date, nullable=False)
    gender = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scans = relationship("Scan", back_populates="patient", cascade="all, delete-orphan")

class Scan(Base):
    __tablename__ = "scans"

    id = Column(String(50), primary_key=True, index=True)
    patient_id = Column(String(50), ForeignKey("patients.id"), nullable=False)
    scan_type = Column(String(50), nullable=False) # ARM, SPINE, Skull, etc.
    image_url = Column(String(255), nullable=False)
    dicom_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="scans")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(50), primary_key=True, index=True)
    scan_id = Column(String(50), ForeignKey("scans.id"), nullable=False)
    fracture_detected = Column(Boolean, nullable=False)
    fracture_type = Column(String(100), nullable=True)
    severity_score = Column(Float, default=0.0)
    displacement_mm = Column(Float, default=0.0)
    angular_deformity_deg = Column(Float, default=0.0)
    urgency_level = Column(String(20), default="LOW") # LOW, MEDIUM, HIGH, EMERGENCY
    ai_confidence = Column(Float, default=0.0)
    ensemble_agreement = Column(Float, default=0.0)
    clinical_notes = Column(Text, nullable=True)
    created_by = Column(String(50), ForeignKey("users.username"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="reports")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False) # VIEW_SCAN, UPLOAD_SCAN, RUN_AI, GENERATE_REPORT, DOWNLOAD_REPORT
    resource_id = Column(String(50), nullable=True)
    ip_address = Column(String(45), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
