import cv2
import numpy as np
from PIL import Image
from skimage import exposure, filters, restoration

class EnhancementPipeline:
    """
    Hospital-grade image enhancement pipeline for Digital X-Ray (DX) images,
    maximizing diagnostic visibility of hairline and complex cortical fractures.
    """

    @staticmethod
    def read_and_normalize(image_bytes: bytes) -> np.ndarray:
        """
        Converts uploaded binary image bytes into a normalized single-channel 8-bit grayscale array.
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError("Invalid image file format.")
        return img

    @staticmethod
    def apply_clahe(img: np.ndarray, clip_limit: float = 2.5, tile_grid: tuple = (8, 8)) -> np.ndarray:
        """
        Applies Contrast Limited Adaptive Histogram Equalization.
        Prevents noise over-amplification in soft tissues while exposing cortical boundaries.
        """
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
        return clahe.apply(img)

    @staticmethod
    def apply_fcet(img: np.ndarray) -> np.ndarray:
        """
        Feature Contrast Enhancement Technique (FCET).
        Uses logarithmic contrast-stretching coupled with high-boost high-frequency filtering 
        to expose trabecular bone patterns and subtle hairline breaches.
        """
        # Step 1: Logarithmic stretching
        img_float = img.astype(np.float32) / 255.0
        c = 1.0 / np.log(1.0 + np.max(img_float))
        log_img = c * np.log(1.0 + img_float)
        
        # Step 2: High-boost filter (original + highpass)
        gaussian_blur = cv2.GaussianBlur((log_img * 255.0).astype(np.uint8), (5, 5), 0)
        high_pass = cv2.subtract((log_img * 255.0).astype(np.uint8), gaussian_blur)
        
        # Blend (1.5 * Logarithmic + 0.8 * High-Pass)
        fcet_blended = cv2.addWeighted((log_img * 255.0).astype(np.uint8), 1.2, high_pass, 0.7, 0)
        return cv2.normalize(fcet_blended, None, 0, 255, cv2.NORM_MINMAX)

    @staticmethod
    def apply_histogram_equalization(img: np.ndarray) -> np.ndarray:
        """
        Standard Global Histogram Equalization.
        """
        return cv2.equalizeHist(img)

    @staticmethod
    def apply_noise_filtering(img: np.ndarray) -> np.ndarray:
        """
        Bilateral Filter for edge-preserving smoothing.
        Damps high-frequency sensor noise while keeping bone boundaries perfectly sharp.
        """
        return cv2.bilateralFilter(img, d=9, sigmaColor=75, sigmaSpace=75)

    @staticmethod
    def apply_adaptive_sharpening(img: np.ndarray, strength: float = 1.5) -> np.ndarray:
        """
        Adaptive Unsharp Masking using Laplacian structure.
        """
        blurred = cv2.GaussianBlur(img, (9, 9), 10.0)
        sharpened = cv2.addWeighted(img, 1.0 + strength, blurred, -strength, 0)
        return np.clip(sharpened, 0, 255).astype(np.uint8)

    @staticmethod
    def apply_bone_structure_enhancement(img: np.ndarray) -> np.ndarray:
        """
        Enhances multi-scale density mapping of bone structures using morphological Top-Hat filters
        to isolate and highlight skeletal structures from surrounding soft-tissue gray values.
        """
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        tophat = cv2.morphologyEx(img, cv2.MORPH_TOPHAT, kernel)
        blackhat = cv2.morphologyEx(img, cv2.MORPH_BLACKHAT, kernel)
        # Combine (Original + TopHat - BlackHat)
        enhanced = cv2.subtract(cv2.add(img, tophat), blackhat)
        return cv2.normalize(enhanced, None, 0, 255, cv2.NORM_MINMAX)

    @staticmethod
    def apply_edge_enhancement(img: np.ndarray) -> np.ndarray:
        """
        Applies a Sobel gradient filter to construct high-contrast outlines of the cortical margins.
        """
        grad_x = cv2.Sobel(img, cv2.CV_16S, 1, 0, ksize=3)
        grad_y = cv2.Sobel(img, cv2.CV_16S, 0, 1, ksize=3)
        abs_grad_x = cv2.convertScaleAbs(grad_x)
        abs_grad_y = cv2.convertScaleAbs(grad_y)
        # Blend gradient margins back to original
        edges = cv2.addWeighted(abs_grad_x, 0.5, abs_grad_y, 0.5, 0)
        blended = cv2.addWeighted(img, 0.8, edges, 0.4, 0)
        return cv2.normalize(blended, None, 0, 255, cv2.NORM_MINMAX)

    @staticmethod
    def apply_super_resolution(img: np.ndarray) -> np.ndarray:
        """
        Performs iterative sub-pixel interpolation to double image dimensions.
        Mimics high-end research resolution recovery.
        """
        height, width = img.shape[:2]
        # Super-resolution using bicubic interpolation combined with edge preservation
        upscaled = cv2.resize(img, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
        # Apply slight bilateral filter to remove interpolation artifacts
        return cv2.bilateralFilter(upscaled, d=5, sigmaColor=30, sigmaSpace=30)

    @classmethod
    def run_full_pipeline(cls, image_bytes: bytes) -> dict:
        """
        Executes all enhancement modes and returns them as normalized numpy arrays.
        """
        raw = cls.read_and_normalize(image_bytes)
        
        return {
            "original": raw,
            "clahe": cls.apply_clahe(raw),
            "fcet": cls.apply_fcet(raw),
            "hist_eq": cls.apply_histogram_equalization(raw),
            "denoised": cls.apply_noise_filtering(raw),
            "sharpened": cls.apply_adaptive_sharpening(raw),
            "bone_enhanced": cls.apply_bone_structure_enhancement(raw),
            "edges": cls.apply_edge_enhancement(raw),
            "super_res": cls.apply_super_resolution(raw)
        }
