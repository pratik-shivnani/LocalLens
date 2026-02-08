from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from typing import Optional
from app.db.database import get_db
from app.db.models import Photo
from app.api.schemas import PhotoResponse, PhotoDetail

router = APIRouter(prefix="/photos", tags=["photos"])


@router.get("/", response_model=list[PhotoResponse])
def list_photos(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    is_video: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List photos with pagination."""
    query = db.query(Photo)
    
    if is_video is not None:
        query = query.filter(Photo.is_video == is_video)
    
    query = query.order_by(Photo.date_taken.desc())
    photos = query.offset(offset).limit(limit).all()
    return photos


@router.get("/{photo_id}", response_model=PhotoDetail)
def get_photo(photo_id: int, db: Session = Depends(get_db)):
    """Get photo details by ID."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return photo


@router.get("/{photo_id}/file")
def get_photo_file(photo_id: int, db: Session = Depends(get_db)):
    """Get the actual photo file."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    file_path = Path(photo.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    
    return FileResponse(
        path=file_path,
        media_type=photo.mime_type,
        filename=photo.file_name
    )


@router.get("/{photo_id}/thumbnail/{size}")
def get_thumbnail(
    photo_id: int,
    size: str = "medium",
    db: Session = Depends(get_db)
):
    """Get photo thumbnail (small, medium, large). Falls back to original file if no thumbnail."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    size_map = {
        "small": photo.thumbnail_small,
        "medium": photo.thumbnail_medium,
        "large": photo.thumbnail_large
    }
    
    thumb_path = size_map.get(size)
    
    # Try thumbnail first
    if thumb_path:
        path = Path(thumb_path)
        if path.exists():
            return FileResponse(path=path, media_type="image/jpeg")
    
    # Fall back to original file
    file_path = Path(photo.file_path)
    if file_path.exists():
        return FileResponse(
            path=file_path,
            media_type=photo.mime_type,
            filename=photo.file_name
        )
    
    raise HTTPException(status_code=404, detail="File not found")


@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    delete_file: bool = False,
    db: Session = Depends(get_db)
):
    """Delete photo from database (optionally from disk)."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    if delete_file:
        file_path = Path(photo.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete thumbnails
        for thumb in [photo.thumbnail_small, photo.thumbnail_medium, photo.thumbnail_large]:
            if thumb:
                thumb_path = Path(thumb)
                if thumb_path.exists():
                    thumb_path.unlink()
    
    db.delete(photo)
    db.commit()
    
    return {"status": "deleted", "photo_id": photo_id}
