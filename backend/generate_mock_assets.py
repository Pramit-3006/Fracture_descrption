import os
import cv2
import numpy as np

def create_mock_clinical_assets():
    """
    Programmatically generates high-fidelity digital radiography X-ray simulations.
    Creates a detailed radius/ulna shaft boundary with a displaced oblique fracture,
    cortical layers, and tissue gradients.
    """
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(static_dir, exist_ok=True)
    
    # 1. Base X-Ray canvas (Dark single-channel grayscale)
    height, width = 500, 650
    img = np.zeros((height, width), dtype=np.uint8)
    
    # Add tissue background ambient gradient (soft X-ray exposure scattering)
    for y in range(height):
        # Exposure scattering gradient
        val = 20 + int(25 * np.exp(-((y - height/2)**2)/(2 * 200**2)))
        img[y, :] = val
        
    # Draw soft tissue silhouette (lighter gray surrounding bone)
    tissue_mask = np.zeros_like(img)
    pts_tissue = np.array([
        [180, 0], [450, 0], [420, height], [200, height]
    ], dtype=np.int32)
    cv2.fillPoly(tissue_mask, [pts_tissue], 55)
    tissue_mask = cv2.GaussianBlur(tissue_mask, (49, 49), 0)
    img = cv2.addWeighted(img, 1.0, tissue_mask, 0.8, 0)
    
    # 2. Draw Main Bone Structure (Proximal Shaft)
    bone_mask = np.zeros_like(img)
    
    # Bone Shaft Upper Fragment
    pts_shaft_up = np.array([
        [280, 0], [340, 0], 
        [325, 200], [260, 200] # Fracture point margin
    ], dtype=np.int32)
    cv2.fillPoly(bone_mask, [pts_shaft_up], 180)
    
    # Bone Shaft Lower Fragment (Oblique Displaced)
    pts_shaft_low = np.array([
        [268, 212], [335, 212], # Displaced fracture margin
        [350, height], [290, height]
    ], dtype=np.int32)
    cv2.fillPoly(bone_mask, [pts_shaft_low], 180)
    
    # Draw internal trabecular marrow canal (darker internal core)
    pts_canal_up = np.array([
        [295, 0], [325, 0],
        [310, 195], [280, 195]
    ], dtype=np.int32)
    cv2.fillPoly(bone_mask, [pts_canal_up], 100)
    
    pts_canal_low = np.array([
        [288, 217], [318, 217],
        [330, height], [310, height]
    ], dtype=np.int32)
    cv2.fillPoly(bone_mask, [pts_canal_low], 100)
    
    # Apply Gaussian smoothing to blur bone marrow interfaces but keep margins relatively distinct
    bone_marrow_blurred = cv2.GaussianBlur(bone_mask, (15, 15), 0)
    img = np.where(bone_mask > 0, cv2.addWeighted(img, 0.2, bone_marrow_blurred, 0.8, 0), img)
    
    # 3. Enhance cortical margins (Bright white bone borders)
    cortical_contours = [
        np.array([[280, 0], [260, 200]], dtype=np.int32),
        np.array([[340, 0], [325, 200]], dtype=np.int32),
        np.array([[268, 212], [290, height]], dtype=np.int32),
        np.array([[335, 212], [350, height]], dtype=np.int32)
    ]
    for contour in cortical_contours:
        cv2.polylines(img, [contour], False, 220, thickness=4)
        
    # Draw jagged oblique fracture lines along margins
    cv2.polylines(img, [np.array([[260, 200], [325, 200]], dtype=np.int32)], False, 240, thickness=2)
    cv2.polylines(img, [np.array([[268, 212], [335, 212]], dtype=np.int32)], False, 240, thickness=2)

    # 4. Blur and add digital sensor noise (high-fidelity X-ray realism)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    noise = np.random.normal(0, 3.5, img.shape).astype(np.float32)
    noisy_img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    
    # Output simulated X-ray file
    output_path = os.path.join(static_dir, "demo_xray.jpg")
    cv2.imwrite(output_path, noisy_img)
    print(f"Mock high-fidelity clinical digital radiography scan created at: {output_path}")

if __name__ == "__main__":
    create_mock_clinical_assets()
