from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import get_settings
import chromadb
from pathlib import Path

settings = get_settings()

# SQLite setup
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ChromaDB setup
def get_chroma_client():
    """Get ChromaDB client for vector storage."""
    Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(settings.chroma_path))


def get_image_collection():
    """Get or create the image embeddings collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="image_embeddings",
        metadata={"hnsw:space": "cosine"}
    )


def get_face_collection():
    """Get or create the face embeddings collection."""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="face_embeddings",
        metadata={"hnsw:space": "cosine"}
    )


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
