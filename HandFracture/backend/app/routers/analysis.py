import os
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.app.database import get_db, mongo_db
from backend.app.models import Scan, AuditLog
from backend.app.schemas import AnalysisResponse, DeformityMetrics, XaiMetrics, ModelOutput, BoundingBox
from backend.app.routers.auth import get_current_user, User
from backend.app.core.enhancement import EnhancementPipeline
from backend.app.core.deformities import BoneDeformityEngine
from backend.app.core.detection import DetectionEngine
from backend.app.core.segmentation import SegmentationEngine
from backend.app.core.statistics import StatisticsEngine
from backend.app.core.xai import XaiEngine
from backend.app.config import settings

router = APIRouter(prefix="/analysis", tags=["AI Diagnostics Engine"])

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static")
UPLOAD_DIR = os.path.join(STATIC_DIR, "uploads")

@router.post("/run/{scan_id}", response_model=AnalysisResponse)
def run_diagnostics(
    scan_id: str,
    human_bbox: Optional[List[Dict[str, Any]]] = Body(default=None, description="Optional radiologist ground truth boxes"),
    human_polygon: Optional[List[List[float]]] = Body(default=None, description="Optional radiologist ground truth polygon mask"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Requested scan record not found.")
        
    # Translate serving URL back to local path
    filename = os.path.basename(scan.image_url)
    physical_path = os.path.join(UPLOAD_DIR, filename)
    
    if not os.path.exists(physical_path):
        raise HTTPException(status_code=404, detail=f"Physical scan image file not found on disk: {physical_path}")
        
    try:
        # Step 1: Read and enhance
        with open(physical_path, "rb") as f:
            img_bytes = f.read()
            
        original_img = cv2.imread(physical_path, cv2.IMREAD_GRAYSCALE)
        height, width = original_img.shape[:2]
        
        # Core image enhancement operations
        enhanced_bundle = EnhancementPipeline.run_full_pipeline(img_bytes)
        fcet_img = enhanced_bundle["fcet"]
        
        # Save enhanced image for client rendering
        enhanced_filename = f"enhanced_{filename}"
        enhanced_path = os.path.join(UPLOAD_DIR, enhanced_filename)
        cv2.imwrite(enhanced_path, fcet_img)
        enhanced_image_url = f"/static/uploads/{enhanced_filename}"
        
        # Step 2: Extract bone fragments & alignment math
        mm_per_pixel = settings.DEFAULT_CALIBRATION_MM_PER_PIXEL
        if scan.dicom_metadata and "PixelSpacing" in scan.dicom_metadata:
            spacings = scan.dicom_metadata["PixelSpacing"]
            if len(spacings) > 0:
                mm_per_pixel = spacings[0]
                
        deformity_results = BoneDeformityEngine.analyze_scan(fcet_img, mm_per_pixel)
        
        # Step 3: Run detection and segmentation models
        detections = DetectionEngine.run_inference(width, height, filename)
        segmentations = SegmentationEngine.generate_masks(width, height, filename)
        
        # Merge bounding box detections using Weighted Box Voting (Ensemble learning)
        ensemble_boxes = StatisticsEngine.ensemble_weighted_boxes(detections)
        
        # Calculate Bayesian Confidence Fusion score
        confidences = [d.confidence for d in detections]
        accuracies = [0.95 if "YOLO" in d.model_name else 0.90 for d in detections] # Prior weight assumptions
        fused_score = StatisticsEngine.bayesian_confidence_fusion(confidences, accuracies)
        
        # Select best consensus box
        consensus_box = ensemble_boxes[0] if ensemble_boxes else BoundingBox(
            x=width * 0.45, y=height * 0.35, width=width * 0.15, height=height * 0.18,
            label="Consensus Fracture", confidence=round(fused_score, 2)
        )
        
        # Step 4: Write high-fidelity Explainable AI overlays to disk
        gcam_img = XaiEngine.create_gradcam_overlay(original_img, consensus_box.__dict__, "Grad-CAM++")
        scorecam_img = XaiEngine.create_gradcam_overlay(original_img, consensus_box.__dict__, "Score-CAM")
        
        gcam_filename = f"gcam_{filename}.png"
        scorecam_filename = f"scorecam_{filename}.png"
        
        cv2.imwrite(os.path.join(UPLOAD_DIR, gcam_filename), gcam_img)
        cv2.imwrite(os.path.join(UPLOAD_DIR, scorecam_filename), scorecam_img)
        
        xai_explanations = XaiEngine.get_explanations(scan_id, scan.scan_type)
        
        xai_bundle = XaiMetrics(
            gcam_url=f"/static/uploads/{gcam_filename}",
            scorecam_url=f"/static/uploads/{scorecam_filename}",
            lime_explanation=xai_explanations["lime"],
            shap_explanation=xai_explanations["shap"],
            attention_hotspots=[{"x": consensus_box.x + consensus_box.width // 2, "y": consensus_box.y + consensus_box.height // 2, "weight": consensus_box.confidence}]
        )
        
        # Assemble Model Outputs including segmentation contours
        final_model_benchmarks = []
        for det, seg in zip(detections, segmentations):
            det.segmentation_mask = seg["mask_polygon"]
            # Save individual Grad-CAM overlay for model benchmarks
            model_gcam = XaiEngine.create_gradcam_overlay(original_img, det.bounding_boxes[0].__dict__, "Grad-CAM")
            model_gcam_filename = f"gcam_{det.model_name.lower().replace(' ', '_')}_{filename}.png"
            cv2.imwrite(os.path.join(UPLOAD_DIR, model_gcam_filename), model_gcam)
            det.gcam_overlay_url = f"/static/uploads/{model_gcam_filename}"
            final_model_benchmarks.append(det)
            
        # Step 5: Research Comparative Annotation Sandbox (Human vs AI)
        comparison = None
        if human_polygon:
            # AI mask is represented by the first segmentation polygon in nnU-Net / Attention U-Net
            ai_polygon = segmentations[0]["mask_polygon"]
            comparison = StatisticsEngine.calculate_polygon_metrics(human_polygon, ai_polygon, width, height)
            
        # Step 6: Package response schema
        analysis_data = AnalysisResponse(
            scan_id=scan_id,
            fracture_detected=len(ensemble_boxes) > 0,
            detected_type=deformity_results["urgency_level"] if len(ensemble_boxes) > 0 else "None",
            affected_bone=scan.scan_type,
            overall_confidence=round(fused_score, 2),
            ensemble_agreement=round(float(len(ensemble_boxes)) / len(detections), 2),
            deformity=DeformityMetrics(
                angular_deformity_deg=deformity_results["angular_deformity_deg"],
                displacement_mm=deformity_results["displacement_mm"],
                fracture_gap_mm=deformity_results["fracture_gap_mm"],
                cortical_disruption_pct=deformity_results["cortical_disruption_pct"],
                fracture_length_mm=deformity_results["fracture_length_mm"]
            ),
            models_benchmark=final_model_benchmarks,
            comparison_metrics=comparison,
            xai=xai_bundle,
            enhanced_image_url=enhanced_image_url,
            processed_at=datetime.utcnow()
        )
        
        # Save dense data to MongoDB research registry
        mongo_db["annotations"].replace_one(
            {"scan_id": scan_id},
            {
                "scan_id": scan_id,
                "findings": analysis_data.model_dump(),
                "human_polygon": human_polygon,
                "recorded_at": datetime.utcnow()
            },
            upsert=True
        )
        
        # Audit Log
        db.add(AuditLog(user_id=current_user.username, action="RUN_AI_ANALYSIS", resource_id=scan_id))
        db.commit()
        
        return analysis_data
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical diagnostic pipeline crashed: {str(e)}"
        )
