from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.db.database import get_db
from app.db.models import Album, AlbumPhoto, Photo
from app.api.schemas import (
    AlbumCreate, AlbumUpdate, AlbumResponse, AlbumDetail, AlbumAddPhotos
)

router = APIRouter(prefix="/albums", tags=["albums"])


@router.get("/", response_model=list[AlbumResponse])
def list_albums(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all albums with photo counts."""
    albums = db.query(Album).order_by(Album.updated_at.desc()).offset(offset).limit(limit).all()
    
    result = []
    for album in albums:
        photo_count = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album.id).count()
        album_dict = {
            "id": album.id,
            "name": album.name,
            "description": album.description,
            "cover_photo_id": album.cover_photo_id,
            "created_at": album.created_at,
            "updated_at": album.updated_at,
            "photo_count": photo_count
        }
        result.append(album_dict)
    
    return result


@router.post("/", response_model=AlbumResponse)
def create_album(album_data: AlbumCreate, db: Session = Depends(get_db)):
    """Create a new album."""
    album = Album(
        name=album_data.name,
        description=album_data.description
    )
    db.add(album)
    db.commit()
    db.refresh(album)
    
    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "cover_photo_id": album.cover_photo_id,
        "created_at": album.created_at,
        "updated_at": album.updated_at,
        "photo_count": 0
    }


@router.get("/{album_id}", response_model=AlbumDetail)
def get_album(album_id: int, db: Session = Depends(get_db)):
    """Get album details with photos."""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    album_photos = (
        db.query(Photo)
        .join(AlbumPhoto, AlbumPhoto.photo_id == Photo.id)
        .filter(AlbumPhoto.album_id == album_id)
        .order_by(AlbumPhoto.sort_order, AlbumPhoto.added_at.desc())
        .all()
    )
    
    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "cover_photo_id": album.cover_photo_id,
        "created_at": album.created_at,
        "updated_at": album.updated_at,
        "photo_count": len(album_photos),
        "photos": album_photos
    }


@router.put("/{album_id}", response_model=AlbumResponse)
def update_album(album_id: int, album_data: AlbumUpdate, db: Session = Depends(get_db)):
    """Update album name, description, or cover photo."""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    if album_data.name is not None:
        album.name = album_data.name
    if album_data.description is not None:
        album.description = album_data.description
    if album_data.cover_photo_id is not None:
        # Verify photo exists
        photo = db.query(Photo).filter(Photo.id == album_data.cover_photo_id).first()
        if not photo:
            raise HTTPException(status_code=404, detail="Cover photo not found")
        album.cover_photo_id = album_data.cover_photo_id
    
    db.commit()
    db.refresh(album)
    
    photo_count = db.query(AlbumPhoto).filter(AlbumPhoto.album_id == album.id).count()
    
    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "cover_photo_id": album.cover_photo_id,
        "created_at": album.created_at,
        "updated_at": album.updated_at,
        "photo_count": photo_count
    }


@router.delete("/{album_id}")
def delete_album(album_id: int, db: Session = Depends(get_db)):
    """Delete an album (photos are not deleted, only the album)."""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    db.delete(album)
    db.commit()
    
    return {"status": "deleted", "album_id": album_id}


@router.post("/{album_id}/photos")
def add_photos_to_album(
    album_id: int,
    data: AlbumAddPhotos,
    db: Session = Depends(get_db)
):
    """Add photos to an album."""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    added = 0
    for photo_id in data.photo_ids:
        # Check if photo exists
        photo = db.query(Photo).filter(Photo.id == photo_id).first()
        if not photo:
            continue
        
        # Check if already in album
        existing = db.query(AlbumPhoto).filter(
            AlbumPhoto.album_id == album_id,
            AlbumPhoto.photo_id == photo_id
        ).first()
        if existing:
            continue
        
        # Get max sort order
        max_order = db.query(func.max(AlbumPhoto.sort_order)).filter(
            AlbumPhoto.album_id == album_id
        ).scalar() or 0
        
        album_photo = AlbumPhoto(
            album_id=album_id,
            photo_id=photo_id,
            sort_order=max_order + 1
        )
        db.add(album_photo)
        added += 1
        
        # Set cover photo if album has none
        if not album.cover_photo_id:
            album.cover_photo_id = photo_id
    
    db.commit()
    
    return {"status": "added", "added_count": added}


@router.delete("/{album_id}/photos/{photo_id}")
def remove_photo_from_album(
    album_id: int,
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Remove a photo from an album."""
    album_photo = db.query(AlbumPhoto).filter(
        AlbumPhoto.album_id == album_id,
        AlbumPhoto.photo_id == photo_id
    ).first()
    
    if not album_photo:
        raise HTTPException(status_code=404, detail="Photo not in album")
    
    db.delete(album_photo)
    
    # Update cover photo if needed
    album = db.query(Album).filter(Album.id == album_id).first()
    if album and album.cover_photo_id == photo_id:
        # Get first remaining photo
        next_photo = db.query(AlbumPhoto).filter(
            AlbumPhoto.album_id == album_id,
            AlbumPhoto.photo_id != photo_id
        ).first()
        album.cover_photo_id = next_photo.photo_id if next_photo else None
    
    db.commit()
    
    return {"status": "removed", "photo_id": photo_id}
