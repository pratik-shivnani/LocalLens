from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Person, Face, Photo
from app.api.schemas import PersonResponse, PersonCreate, PersonUpdate, PhotoResponse
from PIL import Image
from pathlib import Path
import io

router = APIRouter(prefix="/people", tags=["people"])


@router.get("/", response_model=list[PersonResponse])
def list_people(
    named_only: bool = False,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all recognized people."""
    query = db.query(Person)
    
    if named_only:
        query = query.filter(Person.is_named == True)
    
    query = query.order_by(Person.photo_count.desc())
    return query.offset(offset).limit(limit).all()


@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int, db: Session = Depends(get_db)):
    """Get person details."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.put("/{person_id}", response_model=PersonResponse)
def update_person(
    person_id: int,
    person_update: PersonUpdate,
    db: Session = Depends(get_db)
):
    """Update person (e.g., set name)."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    if person_update.name:
        person.name = person_update.name
        person.is_named = True
    
    db.commit()
    db.refresh(person)
    return person


@router.get("/{person_id}/photos", response_model=list[PhotoResponse])
def get_person_photos(
    person_id: int,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get all photos containing a person."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    photos = db.query(Photo).join(Photo.people).filter(
        Person.id == person_id
    ).order_by(Photo.date_taken.desc()).offset(offset).limit(limit).all()
    
    return photos


@router.post("/{person_id}/merge/{other_person_id}")
def merge_people(
    person_id: int,
    other_person_id: int,
    db: Session = Depends(get_db)
):
    """Merge two people (assign all faces from other to this person)."""
    person = db.query(Person).filter(Person.id == person_id).first()
    other_person = db.query(Person).filter(Person.id == other_person_id).first()
    
    if not person or not other_person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    if person_id == other_person_id:
        raise HTTPException(status_code=400, detail="Cannot merge person with self")
    
    # Move all faces to the target person
    db.query(Face).filter(Face.person_id == other_person_id).update(
        {Face.person_id: person_id}
    )
    
    # Update photo associations
    for photo in other_person.photos:
        if photo not in person.photos:
            person.photos.append(photo)
    
    # Update photo count
    person.photo_count = len(person.photos)
    
    # Delete the other person
    db.delete(other_person)
    db.commit()
    
    return {"status": "merged", "person_id": person_id}


@router.delete("/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    """Delete a person (faces become unassigned)."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Unassign all faces
    db.query(Face).filter(Face.person_id == person_id).update(
        {Face.person_id: None}
    )
    
    db.delete(person)
    db.commit()
    
    return {"status": "deleted", "person_id": person_id}


@router.get("/{person_id}/face")
def get_person_face_thumbnail(
    person_id: int,
    size: int = Query(128, le=512),
    db: Session = Depends(get_db)
):
    """Get the representative face thumbnail for a person."""
    person = db.query(Person).filter(Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    
    # Get the representative face or the first face
    face = None
    if person.representative_face_id:
        face = db.query(Face).filter(Face.id == person.representative_face_id).first()
    
    if not face:
        face = db.query(Face).filter(Face.person_id == person_id).first()
    
    if not face:
        raise HTTPException(status_code=404, detail="No face found for person")
    
    # Get the photo
    photo = db.query(Photo).filter(Photo.id == face.photo_id).first()
    if not photo or not Path(photo.file_path).exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Crop and return the face
    try:
        with Image.open(photo.file_path) as img:
            width, height = img.size
            
            # Convert normalized bbox to pixel coordinates
            x = int(face.bbox_x * width)
            y = int(face.bbox_y * height)
            w = int(face.bbox_width * width)
            h = int(face.bbox_height * height)
            
            # Add some padding (20%)
            padding = int(max(w, h) * 0.2)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(width - x, w + 2 * padding)
            h = min(height - y, h + 2 * padding)
            
            # Crop face region
            face_img = img.crop((x, y, x + w, y + h))
            
            # Resize to requested size (square)
            face_img = face_img.resize((size, size), Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed
            if face_img.mode in ("RGBA", "P"):
                face_img = face_img.convert("RGB")
            
            # Save to buffer
            buffer = io.BytesIO()
            face_img.save(buffer, format="JPEG", quality=90)
            buffer.seek(0)
            
            return StreamingResponse(buffer, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating face thumbnail: {e}")


@router.get("/faces/{face_id}/thumbnail")
def get_face_thumbnail(
    face_id: int,
    size: int = Query(128, le=512),
    db: Session = Depends(get_db)
):
    """Get a thumbnail for a specific face."""
    face = db.query(Face).filter(Face.id == face_id).first()
    if not face:
        raise HTTPException(status_code=404, detail="Face not found")
    
    photo = db.query(Photo).filter(Photo.id == face.photo_id).first()
    if not photo or not Path(photo.file_path).exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    
    try:
        with Image.open(photo.file_path) as img:
            width, height = img.size
            
            x = int(face.bbox_x * width)
            y = int(face.bbox_y * height)
            w = int(face.bbox_width * width)
            h = int(face.bbox_height * height)
            
            padding = int(max(w, h) * 0.2)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(width - x, w + 2 * padding)
            h = min(height - y, h + 2 * padding)
            
            face_img = img.crop((x, y, x + w, y + h))
            face_img = face_img.resize((size, size), Image.Resampling.LANCZOS)
            
            if face_img.mode in ("RGBA", "P"):
                face_img = face_img.convert("RGB")
            
            buffer = io.BytesIO()
            face_img.save(buffer, format="JPEG", quality=90)
            buffer.seek(0)
            
            return StreamingResponse(buffer, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating face thumbnail: {e}")
