import random
from typing import List, Dict, Any

class SegmentationEngine:
    """
    Mock orchestration layer for deep medical segmentation frameworks 
    such as U-Net, Attention U-Net, TransUNet, DeepLabV3+, and nnU-Net.
    """
    
    MODELS = [
        "U-Net",
        "Attention U-Net",
        "TransUNet",
        "DeepLabV3+",
        "nnU-Net"
    ]
    
    @classmethod
    def generate_masks(cls, img_width: int, img_height: int, seed_phrase: str = "wrist_fracture") -> List[Dict[str, Any]]:
        """
        Simulates closed contour coordinates for pixel-level fracture masks.
        """
        hash_seed = sum(ord(c) for c in seed_phrase)
        random.seed(hash_seed + 100)
        
        # Center of fracture
        f_x = int(img_width * 0.52)
        f_y = int(img_height * 0.42)
        f_w = int(img_width * 0.12)
        f_h = int(img_height * 0.14)
        
        outputs = []
        
        for model in cls.MODELS:
            # Vary segmentation contour details
            offset_x = random.randint(-8, 8)
            offset_y = random.randint(-8, 8)
            
            c_x = f_x + offset_x
            c_y = f_y + offset_y
            
            # Generate a jagged closed contour (polygon) outlining a hairline or oblique crack
            contour = [
                [c_x - f_w * 0.4, c_y - f_h * 0.2],
                [c_x - f_w * 0.1, c_y - f_h * 0.5],
                [c_x + f_w * 0.3, c_y - f_h * 0.4],
                [c_x + f_w * 0.5, c_y + f_h * 0.1],
                [c_x + f_w * 0.2, c_y + f_h * 0.4],
                [c_x - f_w * 0.3, c_y + f_h * 0.3]
            ]
            
            conf = round(random.uniform(0.86, 0.97), 2)
            latency = round(random.uniform(20.0, 110.0), 1) # nnU-Net is slower but extremely precise
            
            outputs.append({
                "model_name": model,
                "confidence": conf,
                "latency_ms": latency,
                "mask_polygon": contour
            })
            
        return outputs
