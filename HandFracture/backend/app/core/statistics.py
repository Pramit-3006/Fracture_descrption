import numpy as np
import cv2
from typing import List, Dict, Any, Tuple
from backend.app.schemas import BoundingBox, BenchmarkMetrics

class StatisticsEngine:
    """
    Bio-medical statistics engine.
    Computes spatial overlap, confusion matrices, and Bayesian fusion models.
    """

    @staticmethod
    def calculate_polygon_metrics(poly1: List[List[float]], poly2: List[List[float]], width: int = 1000, height: int = 1000) -> BenchmarkMetrics:
        """
        Renders two arbitrary closed polygons onto binary masks and computes
        spatial metrics (IoU, Dice, Precision, Recall, Specificity, Sensitivity, Accuracy).
        """
        # Create empty binary masks
        mask_human = np.zeros((height, width), dtype=np.uint8)
        mask_ai = np.zeros((height, width), dtype=np.uint8)
        
        # Draw filled polygons
        if poly1 and len(poly1) > 2:
            pts1 = np.array(poly1, dtype=np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(mask_human, [pts1], 1)
            
        if poly2 and len(poly2) > 2:
            pts2 = np.array(poly2, dtype=np.int32).reshape((-1, 1, 2))
            cv2.fillPoly(mask_ai, [pts2], 1)
            
        # Calculate pixels
        tp = np.sum(np.logical_and(mask_human == 1, mask_ai == 1))
        fp = np.sum(np.logical_and(mask_human == 0, mask_ai == 1))
        fn = np.sum(np.logical_and(mask_human == 1, mask_ai == 0))
        tn = np.sum(np.logical_and(mask_human == 0, mask_ai == 0))
        
        # Spatial Overlaps
        intersection = tp
        union = tp + fp + fn
        
        iou = float(intersection / union) if union > 0 else 0.0
        dice = float(2 * intersection / (2 * tp + fp + fn)) if (2 * tp + fp + fn) > 0 else 0.0
        
        # Clinical Statistics
        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0 # Same as sensitivity
        sensitivity = recall
        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0
        accuracy = float((tp + tn) / (tp + tn + fp + fn)) if (tp + tn + fp + fn) > 0 else 0.0
        f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
        
        return BenchmarkMetrics(
            dice_coefficient=round(dice, 4),
            iou=round(iou, 4),
            precision=round(precision, 4),
            recall=round(recall, 4),
            f1_score=round(f1, 4),
            accuracy=round(accuracy, 4),
            sensitivity=round(sensitivity, 4),
            specificity=round(specificity, 4)
        )

    @staticmethod
    def bayesian_confidence_fusion(confidences: List[float], model_accuracies: List[float]) -> float:
        """
        Combines individual classification probabilities from diverse models using 
        Bayesian update theory, assuming model dependency structures.
        """
        if not confidences:
            return 0.0
            
        # Convert confidences to odds
        odds_list = []
        for conf, acc in zip(confidences, model_accuracies):
            # Clip bounds
            p = np.clip(conf * acc, 1e-4, 1.0 - 1e-4)
            odds_list.append(p / (1.0 - p))
            
        # Bayesian prior of bone fracture in emergency trauma (approx 40%)
        prior_p = 0.40
        prior_odds = prior_p / (1.0 - prior_p)
        
        # Multiply odds
        fused_odds = prior_odds
        for odds in odds_list:
            fused_odds *= odds
            
        # Convert back to probability
        fused_prob = fused_odds / (1.0 + fused_odds)
        return float(np.clip(fused_prob, 0.0, 1.0))

    @staticmethod
    def ensemble_weighted_boxes(models_output: List[Any], iou_threshold: float = 0.5) -> List[BoundingBox]:
        """
        Applies a Weighted Box Voting algorithm (Ensemble Learning).
        Clusters overlapping boxes and aggregates coordinate dimensions 
        weighted by the relative confidence of each specific detector.
        """
        all_boxes = []
        for out in models_output:
            for box in out.bounding_boxes:
                all_boxes.append((box, out.model_name))
                
        if not all_boxes:
            return []
            
        # Group overlapping boxes
        used = [False] * len(all_boxes)
        consensus_boxes = []
        
        for i in range(len(all_boxes)):
            if used[i]:
                continue
                
            box_i, m_i = all_boxes[i]
            cluster = [(box_i, m_i)]
            used[i] = True
            
            for j in range(i + 1, len(all_boxes)):
                if used[j]:
                    continue
                box_j, m_j = all_boxes[j]
                
                # Check 1D Intersection over Union
                x1 = max(box_i.x, box_j.x)
                y1 = max(box_i.y, box_j.y)
                x2 = min(box_i.x + box_i.width, box_j.x + box_j.width)
                y2 = min(box_i.y + box_i.height, box_j.y + box_j.height)
                
                inter_w = max(0, x2 - x1)
                inter_h = max(0, y2 - y1)
                inter_area = inter_w * inter_h
                
                area_i = box_i.width * box_i.height
                area_j = box_j.width * box_j.height
                union_area = area_i + area_j - inter_area
                
                box_iou = inter_area / union_area if union_area > 0 else 0.0
                
                if box_iou >= iou_threshold:
                    cluster.append((box_j, m_j))
                    used[j] = True
                    
            # Compute weighted bounding box
            sum_conf = sum(b.confidence for b, _ in cluster)
            
            weighted_x = sum(b.x * b.confidence for b, _ in cluster) / sum_conf
            weighted_y = sum(b.y * b.confidence for b, _ in cluster) / sum_conf
            weighted_w = sum(b.width * b.confidence for b, _ in cluster) / sum_conf
            weighted_h = sum(b.height * b.confidence for b, _ in cluster) / sum_conf
            
            consensus_boxes.append(
                BoundingBox(
                    x=round(weighted_x, 2),
                    y=round(weighted_y, 2),
                    width=round(weighted_w, 2),
                    height=round(weighted_h, 2),
                    label="Consensus Fracture Area",
                    confidence=round(sum_conf / len(cluster), 2)
                )
            )
            
        return consensus_boxes
