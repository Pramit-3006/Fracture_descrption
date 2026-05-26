import random
from typing import List, Dict, Any
from backend.app.schemas import BoundingBox, ModelOutput

class DetectionEngine:
    """
    Mock orchestration layer for state-of-the-art computer vision models,
    simulating realistic medical detection output.
    """
    
    MODELS = [
        "YOLOv11",
        "YOLOv10",
        "YOLOv9",
        "Faster R-CNN",
        "RetinaNet",
        "EfficientDet",
        "DETR",
        "RT-DETR",
        "Cascade R-CNN"
    ]

    @classmethod
    def run_inference(cls, img_width: int, img_height: int, seed_phrase: str = "wrist_fracture") -> List[ModelOutput]:
        """
        Executes multi-model inference simulations.
        Uses a seed based on the filename to ensure stable, realistic predictions.
        """
        # Determine deterministic random offset using string hash
        hash_seed = sum(ord(c) for c in seed_phrase)
        random.seed(hash_seed)
        
        # Determine "true" mock fracture region
        true_x = int(img_width * 0.45)
        true_y = int(img_height * 0.35)
        true_w = int(img_width * 0.15)
        true_h = int(img_height * 0.18)
        
        outputs = []
        
        for model in cls.MODELS:
            # Add realistic variance in bbox coords and confidence
            var_x = random.randint(-15, 15)
            var_y = random.randint(-15, 15)
            var_w = random.randint(-10, 10)
            var_h = random.randint(-10, 10)
            
            box_x = max(0, true_x + var_x)
            box_y = max(0, true_y + var_y)
            box_w = max(20, true_w + var_w)
            box_h = max(20, true_h + var_h)
            
            # Models have distinct baseline accuracies/latencies
            if "YOLO" in model:
                conf = round(random.uniform(0.91, 0.98), 2)
                latency = round(random.uniform(8.0, 15.0), 1)
            elif "R-CNN" in model:
                conf = round(random.uniform(0.88, 0.96), 2)
                latency = round(random.uniform(45.0, 75.0), 1)
            elif "DETR" in model:
                conf = round(random.uniform(0.89, 0.97), 2)
                latency = round(random.uniform(30.0, 50.0), 1)
            else: # EfficientDet, RetinaNet
                conf = round(random.uniform(0.85, 0.93), 2)
                latency = round(random.uniform(18.0, 30.0), 1)
                
            bbox = BoundingBox(
                x=box_x,
                y=box_y,
                width=box_w,
                height=box_h,
                label="Distal Radius Fracture",
                confidence=conf
            )
            
            # Simulate detailed segmentation contour around the box
            seg_contour = [
                [box_x + box_w * 0.1, box_y + box_h * 0.3],
                [box_x + box_w * 0.5, box_y + box_h * 0.1],
                [box_x + box_w * 0.9, box_y + box_h * 0.4],
                [box_x + box_w * 0.8, box_y + box_h * 0.8],
                [box_x + box_w * 0.3, box_y + box_h * 0.9],
                [box_x + box_w * 0.1, box_y + box_h * 0.6]
            ]
            
            outputs.append(
                ModelOutput(
                    model_name=model,
                    confidence=conf,
                    inference_time_ms=latency,
                    bounding_boxes=[bbox],
                    segmentation_mask=seg_contour,
                    gcam_overlay_url=f"/static/gcam_{model.lower().replace(' ', '_')}.png"
                )
            )
            
        return outputs
