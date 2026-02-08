import torch
import open_clip
from PIL import Image
from pathlib import Path
from typing import Union
import numpy as np
from app.core.config import get_settings

settings = get_settings()


class CLIPEmbedder:
    """CLIP model for generating image and text embeddings."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.device = self._get_device()
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            settings.clip_model,
            pretrained=settings.clip_pretrained,
            device=self.device
        )
        self.tokenizer = open_clip.get_tokenizer(settings.clip_model)
        self.model.eval()
        self._initialized = True
        print(f"CLIP model loaded on {self.device}")
    
    def _get_device(self) -> str:
        if settings.device == "mps" and torch.backends.mps.is_available():
            return "mps"
        elif settings.device == "cuda" and torch.cuda.is_available():
            return "cuda"
        return "cpu"
    
    @torch.no_grad()
    def encode_image(self, image: Union[str, Path, Image.Image]) -> np.ndarray:
        """Generate embedding for a single image."""
        if isinstance(image, (str, Path)):
            image = Image.open(image).convert("RGB")
        
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)
        embedding = self.model.encode_image(image_tensor)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy().flatten()
    
    @torch.no_grad()
    def encode_images_batch(self, images: list[Union[str, Path, Image.Image]]) -> np.ndarray:
        """Generate embeddings for a batch of images."""
        processed = []
        for img in images:
            if isinstance(img, (str, Path)):
                img = Image.open(img).convert("RGB")
            processed.append(self.preprocess(img))
        
        image_tensor = torch.stack(processed).to(self.device)
        embeddings = self.model.encode_image(image_tensor)
        embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
        return embeddings.cpu().numpy()
    
    @torch.no_grad()
    def encode_text(self, text: str) -> np.ndarray:
        """Generate embedding for a text query."""
        tokens = self.tokenizer([text]).to(self.device)
        embedding = self.model.encode_text(tokens)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return embedding.cpu().numpy().flatten()
    
    @torch.no_grad()
    def encode_texts_batch(self, texts: list[str]) -> np.ndarray:
        """Generate embeddings for multiple text queries."""
        tokens = self.tokenizer(texts).to(self.device)
        embeddings = self.model.encode_text(tokens)
        embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
        return embeddings.cpu().numpy()
    
    def similarity(self, image_embedding: np.ndarray, text_embedding: np.ndarray) -> float:
        """Calculate cosine similarity between image and text embeddings."""
        return float(np.dot(image_embedding, text_embedding))


def get_clip_embedder() -> CLIPEmbedder:
    """Get singleton CLIP embedder instance."""
    return CLIPEmbedder()
