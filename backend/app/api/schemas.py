from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Photo schemas
class PhotoBase(BaseModel):
    file_name: str
    is_video: bool = False


class PhotoResponse(PhotoBase):
    id: int
    file_path: str
    thumbnail_small: Optional[str] = None
    thumbnail_medium: Optional[str] = None
    thumbnail_large: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    date_taken: Optional[datetime] = None
    location_name: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    is_processed: bool = False
    
    class Config:
        from_attributes = True


class PhotoDetail(PhotoResponse):
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    duration_seconds: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    date_imported: Optional[datetime] = None
    tags: list["TagResponse"] = []
    people: list["PersonResponse"] = []
    pets: list["PetResponse"] = []


# Tag schemas
class TagResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    
    class Config:
        from_attributes = True


# Person schemas
class PersonBase(BaseModel):
    name: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(PersonBase):
    pass


class PersonResponse(PersonBase):
    id: int
    is_named: bool = False
    photo_count: int = 0
    representative_face_id: Optional[int] = None
    
    class Config:
        from_attributes = True


# Pet schemas
class PetBase(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None


class PetCreate(PetBase):
    pass


class PetUpdate(PetBase):
    pass


class PetResponse(PetBase):
    id: int
    is_named: bool = False
    photo_count: int = 0
    
    class Config:
        from_attributes = True


# Face schemas
class FaceResponse(BaseModel):
    id: int
    photo_id: int
    person_id: Optional[int] = None
    bbox_x: float
    bbox_y: float
    bbox_width: float
    bbox_height: float
    confidence: float
    age_estimate: Optional[int] = None
    gender_estimate: Optional[str] = None
    
    class Config:
        from_attributes = True


# Search schemas
class SearchQuery(BaseModel):
    text: Optional[str] = None
    people_ids: Optional[list[int]] = None
    pet_ids: Optional[list[int]] = None
    tag_names: Optional[list[str]] = None
    location: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    is_video: Optional[bool] = None
    limit: int = 50
    offset: int = 0


class SearchSuggestions(BaseModel):
    people: list[dict]
    pets: list[dict]
    tags: list[dict]
    locations: list[str]


# Import schemas
class ImportRequest(BaseModel):
    source_path: str
    source_type: str = "folder"  # folder, google_takeout, usb
    name: Optional[str] = None


class ImportSourceResponse(BaseModel):
    id: int
    name: str
    source_type: str
    source_path: Optional[str] = None
    date_imported: datetime
    photo_count: int
    status: str
    
    class Config:
        from_attributes = True


class ImportProgress(BaseModel):
    source_id: int
    total_files: int
    processed_files: int
    status: str


# Processing schemas
class ProcessingStatus(BaseModel):
    queue_length: int
    processing: int
    completed: int
    failed: int


# Stats schemas
class LibraryStats(BaseModel):
    total_photos: int
    total_videos: int
    total_people: int
    total_pets: int
    total_tags: int
    processed_count: int
    unprocessed_count: int
    storage_size_bytes: int


# Album schemas
class AlbumCreate(BaseModel):
    name: str
    description: Optional[str] = None


class AlbumUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    cover_photo_id: Optional[int] = None


class AlbumResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    cover_photo_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    photo_count: int = 0
    
    class Config:
        from_attributes = True


class AlbumDetail(AlbumResponse):
    photos: list[PhotoResponse] = []


class AlbumAddPhotos(BaseModel):
    photo_ids: list[int]


# Update forward references
PhotoDetail.model_rebuild()
