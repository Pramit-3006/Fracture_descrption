import pytest
import numpy as np
from backend.app.core.dicom_parser import DicomParser
from backend.app.core.enhancement import EnhancementPipeline
from backend.app.core.deformities import BoneDeformityEngine
from backend.app.core.statistics import StatisticsEngine
from backend.app.schemas import BoundingBox

def test_dicom_parser_simulated_fallback():
    raw_bytes = b"DICM_TEST_MOCK_BYTES"
    metadata = DicomParser.parse_file(raw_bytes)
    assert metadata["PatientName"] == "Anonymous Patient"
    assert metadata["PixelSpacing"] == [0.139, 0.139]
    assert metadata["Modality"] == "DX"

def test_dicom_sr_builder():
    report_data = {
        "fracture_detected": True,
        "affected_bone": "WRIST",
        "displacement_mm": 3.4,
        "angular_deformity_deg": 12.5
    }
    sr = DicomParser.generate_dicom_sr(report_data)
    assert sr["SOPClassUID"] == "1.2.840.10008.5.1.4.1.1.88.33"
    assert sr["VerificationFlag"] == "VERIFIED"

def test_enhancement_conversions():
    # Build black test array
    test_img = (np.random.rand(100, 100) * 255).astype(np.uint8)
    
    clahe_out = EnhancementPipeline.apply_clahe(test_img)
    assert clahe_out.shape == (100, 100)
    
    fcet_out = EnhancementPipeline.apply_fcet(test_img)
    assert fcet_out.shape == (100, 100)
    
    super_out = EnhancementPipeline.apply_super_resolution(test_img)
    assert super_out.shape == (200, 200) # Dimension doubled

def test_bone_deformity_fcm_clustering():
    # Construct synthetic bone shaft split (0 background, 1 tissue, 2 bone)
    synthetic_xray = np.zeros((60, 60), dtype=np.uint8)
    synthetic_xray[15:45, 10:25] = 220 # Main bone body
    synthetic_xray[20:40, 35:50] = 220 # Displaced fragment
    
    segmented, centers = BoneDeformityEngine.fuzzy_c_means(synthetic_xray, c=3)
    assert segmented.shape == (60, 60)
    # Dense bone (220 intensity) should be mapped inside cluster 2
    assert segmented[30, 15] == 2
    assert segmented[30, 40] == 2

def test_pca_deformity_math():
    # Create two parallel offset bone shafts
    frag1 = np.array([[[10, 10]], [[10, 30]], [[20, 30]], [[20, 10]]], dtype=np.int32)
    frag2 = np.array([[[10, 40]], [[10, 60]], [[20, 60]], [[20, 40]]], dtype=np.int32)
    
    angle, disp, gap = BoneDeformityEngine.calculate_alignment_and_displacement([frag1, frag2], mm_per_pixel=0.1)
    # Margins are parallel, so angle should be approximately 0.0 or 180.0
    assert angle < 1.0 or abs(angle - 180.0) < 1.0
    # Displacement is offset between parallel axes
    assert disp >= 0.0

def test_statistics_spatial_overlaps():
    # 2 identical squares overlap perfectly (Dice = 1.0, IoU = 1.0)
    square_human = [[10, 10], [50, 10], [50, 50], [10, 50]]
    square_ai = [[10, 10], [50, 10], [50, 50], [10, 50]]
    
    metrics = StatisticsEngine.calculate_polygon_metrics(square_human, square_ai, width=100, height=100)
    assert metrics.dice_coefficient == 1.0
    assert metrics.iou == 1.0
    assert metrics.sensitivity == 1.0
    assert metrics.specificity == 1.0

def test_bayesian_confidence_fusion():
    confidences = [0.90, 0.85, 0.70]
    accuracies = [0.95, 0.90, 0.85]
    fused_score = StatisticsEngine.bayesian_confidence_fusion(confidences, accuracies)
    assert fused_score > 0.80
    assert fused_score <= 1.0
