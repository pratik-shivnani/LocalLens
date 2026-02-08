import numpy as np
from PIL import Image
from pathlib import Path
from typing import Union, Optional
from dataclasses import dataclass
from app.core.config import get_settings

settings = get_settings()


@dataclass
class FaceDetection:
    """Represents a detected face in an image."""
    bbox: tuple[float, float, float, float]  # x, y, width, height (normalized 0-1)
    confidence: float
    embedding: np.ndarray
    age: Optional[int] = None
    gender: Optional[str] = None
    landmarks: Optional[np.ndarray] = None


class FaceRecognizer:
    """Face detection and recognition using InsightFace."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        try:
            from insightface.app import FaceAnalysis
            
            # Initialize InsightFace
            self.app = FaceAnalysis(
                name="buffalo_l",
                providers=self._get_providers()
            )
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            self._initialized = True
            print("InsightFace model loaded")
        except Exception as e:
            print(f"Warning: Could not load InsightFace: {e}")
            self.app = None
            self._initialized = True
    
    def _get_providers(self) -> list[str]:
        """Get ONNX Runtime providers based on device setting."""
        if settings.device == "cuda":
            return ["CUDAExecutionProvider", "CPUExecutionProvider"]
        elif settings.device == "mps":
            # CoreML provider for Apple Silicon
            return ["CoreMLExecutionProvider", "CPUExecutionProvider"]
        return ["CPUExecutionProvider"]
    
    def detect_faces(self, image: Union[str, Path, Image.Image, np.ndarray]) -> list[FaceDetection]:
        """Detect and analyze faces in an image."""
        if self.app is None:
            return []
        
        # Convert to numpy array if needed
        if isinstance(image, (str, Path)):
            image = Image.open(image).convert("RGB")
        if isinstance(image, Image.Image):
            img_array = np.array(image)
        else:
            img_array = image
        
        # InsightFace expects BGR
        if len(img_array.shape) == 3 and img_array.shape[2] == 3:
            img_bgr = img_array[:, :, ::-1]
        else:
            img_bgr = img_array
        
        faces = self.app.get(img_bgr)
        
        height, width = img_array.shape[:2]
        detections = []
        
        for face in faces:
            # Normalize bounding box
            bbox = face.bbox
            norm_bbox = (
                float(bbox[0] / width),
                float(bbox[1] / height),
                float((bbox[2] - bbox[0]) / width),
                float((bbox[3] - bbox[1]) / height)
            )
            
            detection = FaceDetection(
                bbox=norm_bbox,
                confidence=float(face.det_score),
                embedding=face.embedding,
                age=int(face.age) if hasattr(face, 'age') else None,
                gender='male' if hasattr(face, 'gender') and face.gender == 1 else 'female' if hasattr(face, 'gender') else None,
                landmarks=face.landmark_2d_106 if hasattr(face, 'landmark_2d_106') else None
            )
            detections.append(detection)
        
        return detections
    
    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two face embeddings."""
        embedding1 = embedding1 / np.linalg.norm(embedding1)
        embedding2 = embedding2 / np.linalg.norm(embedding2)
        return float(np.dot(embedding1, embedding2))
    
    def find_matching_face(
        self,
        query_embedding: np.ndarray,
        embeddings: list[np.ndarray],
        threshold: float = 0.5
    ) -> Optional[int]:
        """Find the best matching face from a list of embeddings."""
        if not embeddings:
            return None
        
        best_match = -1
        best_similarity = threshold
        
        for i, emb in enumerate(embeddings):
            sim = self.compute_similarity(query_embedding, emb)
            if sim > best_similarity:
                best_similarity = sim
                best_match = i
        
        return best_match if best_match >= 0 else None


def get_face_recognizer() -> FaceRecognizer:
    """Get singleton face recognizer instance."""
    return FaceRecognizer()
