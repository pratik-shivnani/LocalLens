import numpy as np
from PIL import Image
from pathlib import Path
from typing import Union
from dataclasses import dataclass
from app.ml.clip_embeddings import get_clip_embedder

# Predefined tag categories and their labels
SCENE_TAGS = [
    "beach", "mountain", "forest", "city", "street", "indoor", "outdoor",
    "sunset", "sunrise", "night", "day", "cloudy", "sunny", "rainy",
    "snow", "desert", "lake", "river", "ocean", "park", "garden"
]

OBJECT_TAGS = [
    "car", "bicycle", "motorcycle", "airplane", "boat", "train",
    "food", "drink", "cake", "pizza", "coffee",
    "furniture", "chair", "table", "bed", "sofa", "desk",
    "electronics", "phone", "laptop", "television", "camera",
    "plant", "flower", "tree", "animal", "bird",
    "building", "house", "bridge", "tower",
    "book", "art", "painting", "sculpture"
]

ACTIVITY_TAGS = [
    "party", "celebration", "wedding", "birthday", "graduation",
    "travel", "vacation", "hiking", "swimming", "sports",
    "cooking", "eating", "drinking", "reading", "working",
    "selfie", "group photo", "portrait", "landscape"
]

PET_TAGS = [
    "dog", "cat", "bird", "fish", "hamster", "rabbit", "turtle"
]

ALL_TAGS = {
    "scene": SCENE_TAGS,
    "object": OBJECT_TAGS,
    "activity": ACTIVITY_TAGS,
    "pet": PET_TAGS
}


@dataclass
class TagPrediction:
    """A predicted tag with confidence score."""
    name: str
    category: str
    confidence: float


class AutoTagger:
    """Automatic image tagging using CLIP zero-shot classification."""
    
    def __init__(self):
        self.clip = get_clip_embedder()
        self._tag_embeddings: dict[str, np.ndarray] = {}
        self._precompute_tag_embeddings()
    
    def _precompute_tag_embeddings(self):
        """Precompute embeddings for all predefined tags."""
        all_tags = []
        for category, tags in ALL_TAGS.items():
            for tag in tags:
                all_tags.append((category, tag))
        
        # Create prompts for better CLIP understanding
        prompts = [f"a photo of {tag}" for _, tag in all_tags]
        embeddings = self.clip.encode_texts_batch(prompts)
        
        for i, (category, tag) in enumerate(all_tags):
            self._tag_embeddings[f"{category}:{tag}"] = embeddings[i]
        
        print(f"Precomputed embeddings for {len(all_tags)} tags")
    
    def predict_tags(
        self,
        image: Union[str, Path, Image.Image],
        threshold: float = 0.25,
        top_k: int = 10
    ) -> list[TagPrediction]:
        """Predict tags for an image."""
        image_embedding = self.clip.encode_image(image)
        
        predictions = []
        for key, tag_embedding in self._tag_embeddings.items():
            category, tag = key.split(":", 1)
            similarity = float(np.dot(image_embedding, tag_embedding))
            
            if similarity >= threshold:
                predictions.append(TagPrediction(
                    name=tag,
                    category=category,
                    confidence=similarity
                ))
        
        # Sort by confidence and return top_k
        predictions.sort(key=lambda x: x.confidence, reverse=True)
        return predictions[:top_k]
    
    def predict_custom_tags(
        self,
        image: Union[str, Path, Image.Image],
        tags: list[str],
        threshold: float = 0.2
    ) -> list[TagPrediction]:
        """Predict custom tags for an image."""
        image_embedding = self.clip.encode_image(image)
        
        prompts = [f"a photo of {tag}" for tag in tags]
        tag_embeddings = self.clip.encode_texts_batch(prompts)
        
        predictions = []
        for i, tag in enumerate(tags):
            similarity = float(np.dot(image_embedding, tag_embeddings[i]))
            if similarity >= threshold:
                predictions.append(TagPrediction(
                    name=tag,
                    category="custom",
                    confidence=similarity
                ))
        
        predictions.sort(key=lambda x: x.confidence, reverse=True)
        return predictions
    
    def detect_pets(
        self,
        image: Union[str, Path, Image.Image],
        threshold: float = 0.3
    ) -> list[TagPrediction]:
        """Specifically detect pets in an image."""
        image_embedding = self.clip.encode_image(image)
        
        predictions = []
        for tag in PET_TAGS:
            key = f"pet:{tag}"
            if key in self._tag_embeddings:
                similarity = float(np.dot(image_embedding, self._tag_embeddings[key]))
                if similarity >= threshold:
                    predictions.append(TagPrediction(
                        name=tag,
                        category="pet",
                        confidence=similarity
                    ))
        
        predictions.sort(key=lambda x: x.confidence, reverse=True)
        return predictions


_auto_tagger: AutoTagger | None = None


def get_auto_tagger() -> AutoTagger:
    """Get singleton auto tagger instance."""
    global _auto_tagger
    if _auto_tagger is None:
        _auto_tagger = AutoTagger()
    return _auto_tagger
