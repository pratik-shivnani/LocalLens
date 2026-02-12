from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Table, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

# Association tables
photo_tags = Table(
    "photo_tags",
    Base.metadata,
    Column("photo_id", Integer, ForeignKey("photos.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True)
)

photo_people = Table(
    "photo_people",
    Base.metadata,
    Column("photo_id", Integer, ForeignKey("photos.id"), primary_key=True),
    Column("person_id", Integer, ForeignKey("people.id"), primary_key=True)
)

photo_pets = Table(
    "photo_pets",
    Base.metadata,
    Column("photo_id", Integer, ForeignKey("photos.id"), primary_key=True),
    Column("pet_id", Integer, ForeignKey("pets.id"), primary_key=True)
)


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(String, unique=True, nullable=False, index=True)
    file_name = Column(String, nullable=False)
    file_hash = Column(String, unique=True, nullable=False, index=True)
    file_size = Column(Integer)
    mime_type = Column(String)
    
    # Media type
    is_video = Column(Boolean, default=False)
    duration_seconds = Column(Float, nullable=True)  # For videos
    
    # Dimensions
    width = Column(Integer)
    height = Column(Integer)
    
    # Timestamps
    date_taken = Column(DateTime, index=True)
    date_imported = Column(DateTime, default=datetime.utcnow)
    date_modified = Column(DateTime)
    
    # Location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String, nullable=True)  # Reverse geocoded
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    
    # Camera info
    camera_make = Column(String, nullable=True)
    camera_model = Column(String, nullable=True)
    
    # Processing status
    is_processed = Column(Boolean, default=False)
    has_embeddings = Column(Boolean, default=False)
    has_faces_processed = Column(Boolean, default=False)
    
    # Google Photos metadata (if imported from takeout)
    google_photo_id = Column(String, nullable=True)
    google_metadata = Column(JSON, nullable=True)
    
    # Thumbnail paths
    thumbnail_small = Column(String, nullable=True)
    thumbnail_medium = Column(String, nullable=True)
    thumbnail_large = Column(String, nullable=True)
    
    # Relationships
    tags = relationship("Tag", secondary=photo_tags, back_populates="photos")
    people = relationship("Person", secondary=photo_people, back_populates="photos")
    pets = relationship("Pet", secondary=photo_pets, back_populates="photos")
    faces = relationship("Face", back_populates="photo")
    import_source = relationship("ImportSource", back_populates="photos")
    import_source_id = Column(Integer, ForeignKey("import_sources.id"), nullable=True)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    category = Column(String, nullable=True)  # scene, object, activity, etc.
    confidence_threshold = Column(Float, default=0.5)
    
    photos = relationship("Photo", secondary=photo_tags, back_populates="tags")


class Person(Base):
    __tablename__ = "people"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # User-assigned name
    is_named = Column(Boolean, default=False)
    cluster_id = Column(String, nullable=True)  # For face clustering
    representative_face_id = Column(Integer, nullable=True)  # Best face for display
    photo_count = Column(Integer, default=0)
    
    photos = relationship("Photo", secondary=photo_people, back_populates="people")
    faces = relationship("Face", back_populates="person")


class Pet(Base):
    __tablename__ = "pets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    species = Column(String, nullable=True)  # dog, cat, etc.
    is_named = Column(Boolean, default=False)
    cluster_id = Column(String, nullable=True)
    photo_count = Column(Integer, default=0)
    
    photos = relationship("Photo", secondary=photo_pets, back_populates="pets")


class Face(Base):
    __tablename__ = "faces"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id"), nullable=True)
    
    # Bounding box (normalized 0-1)
    bbox_x = Column(Float)
    bbox_y = Column(Float)
    bbox_width = Column(Float)
    bbox_height = Column(Float)
    
    # Face attributes
    confidence = Column(Float)
    age_estimate = Column(Integer, nullable=True)
    gender_estimate = Column(String, nullable=True)
    
    # Embedding stored in ChromaDB, reference by this ID
    embedding_id = Column(String, nullable=True)
    
    photo = relationship("Photo", back_populates="faces")
    person = relationship("Person", back_populates="faces")


class ImportSource(Base):
    __tablename__ = "import_sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # google_takeout, usb, folder
    source_path = Column(String, nullable=True)
    date_imported = Column(DateTime, default=datetime.utcnow)
    photo_count = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, processing, completed, failed
    
    photos = relationship("Photo", back_populates="import_source")


class ProcessingQueue(Base):
    __tablename__ = "processing_queue"

    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    task_type = Column(String, nullable=False)  # embeddings, faces, tags, thumbnails
    status = Column(String, default="pending")  # pending, processing, completed, failed
    priority = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class Album(Base):
    __tablename__ = "albums"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    cover_photo_id = Column(Integer, ForeignKey("photos.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cover_photo = relationship("Photo", foreign_keys=[cover_photo_id])
    album_photos = relationship("AlbumPhoto", back_populates="album", cascade="all, delete-orphan")


class AlbumPhoto(Base):
    __tablename__ = "album_photos"

    id = Column(Integer, primary_key=True, index=True)
    album_id = Column(Integer, ForeignKey("albums.id", ondelete="CASCADE"), nullable=False)
    photo_id = Column(Integer, ForeignKey("photos.id"), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    sort_order = Column(Integer, default=0)
    
    album = relationship("Album", back_populates="album_photos")
    photo = relationship("Photo")
