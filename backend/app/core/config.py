from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Paths
    photos_library_path: Path = Path("./data/photos")
    thumbnail_path: Path = Path("./data/thumbnails")
    database_url: str = "sqlite:///./data/db/photos.db"
    chroma_path: Path = Path("./data/embeddings")

    # ML Settings
    device: str = "mps"  # mps, cuda, or cpu
    clip_model: str = "ViT-B-32"
    clip_pretrained: str = "openai"
    batch_size: int = 32

    # Server
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True

    # Thumbnail sizes
    thumbnail_sizes: list[int] = [200, 400, 800]

    # Supported formats
    image_extensions: set[str] = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".tiff"}
    video_extensions: set[str] = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v", ".3gp"}

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
