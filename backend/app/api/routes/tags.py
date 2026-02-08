from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Tag, Photo

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("/")
def list_tags(db: Session = Depends(get_db)):
    """List all tags with photo counts."""
    tags = db.query(Tag).all()
    result = []
    for tag in tags:
        result.append({
            "id": tag.id,
            "name": tag.name,
            "category": tag.category,
            "photo_count": len(tag.photos)
        })
    return sorted(result, key=lambda x: x["photo_count"], reverse=True)


@router.get("/{tag_id}/photos")
def get_tag_photos(
    tag_id: int,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get photos with a specific tag."""
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        return []
    
    photos = tag.photos[offset:offset + limit]
    return [
        {
            "id": p.id,
            "file_name": p.file_name,
            "file_path": p.file_path,
            "is_video": p.is_video,
            "thumbnail_small": p.thumbnail_small,
            "thumbnail_medium": p.thumbnail_medium,
            "thumbnail_large": p.thumbnail_large,
            "width": p.width,
            "height": p.height,
            "date_taken": p.date_taken,
            "location_name": p.location_name,
            "is_processed": p.is_processed
        }
        for p in photos
    ]
