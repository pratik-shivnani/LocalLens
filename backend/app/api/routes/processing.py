from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.db.models import Photo, ProcessingQueue, Tag, Person, Pet
from app.api.schemas import ProcessingStatus, LibraryStats
from app.services.processing_service import ProcessingService, get_processing_state, request_stop_processing

router = APIRouter(prefix="/processing", tags=["processing"])


def run_processing_batch(db_url: str, batch_size: int = 10):
    """Background task for processing photos."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        service = ProcessingService(db)
        processed = service.process_queue(batch_size=batch_size)
        print(f"Processed {processed} items")
    except Exception as e:
        print(f"Processing error: {e}")
    finally:
        db.close()


def run_continuous_processing(db_url: str, max_items: int = None):
    """Background task for continuous processing with progress tracking."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        service = ProcessingService(db)
        processed = service.process_continuous(max_items=max_items)
        print(f"Continuous processing completed: {processed} items")
    except Exception as e:
        print(f"Processing error: {e}")
    finally:
        db.close()


@router.post("/start")
def start_processing(
    batch_size: int = 10,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Start background processing of queued photos."""
    from app.core.config import get_settings
    settings = get_settings()
    
    background_tasks.add_task(run_processing_batch, settings.database_url, batch_size)
    
    return {"status": "started", "batch_size": batch_size}


@router.get("/status", response_model=ProcessingStatus)
def get_processing_status(db: Session = Depends(get_db)):
    """Get current processing queue status."""
    pending = db.query(ProcessingQueue).filter(ProcessingQueue.status == "pending").count()
    processing = db.query(ProcessingQueue).filter(ProcessingQueue.status == "processing").count()
    completed = db.query(ProcessingQueue).filter(ProcessingQueue.status == "completed").count()
    failed = db.query(ProcessingQueue).filter(ProcessingQueue.status == "failed").count()
    
    return ProcessingStatus(
        queue_length=pending,
        processing=processing,
        completed=completed,
        failed=failed
    )


@router.post("/queue-all")
def queue_all_unprocessed(db: Session = Depends(get_db)):
    """Queue all unprocessed photos for processing."""
    unprocessed = db.query(Photo).filter(Photo.is_processed == False).all()
    
    service = ProcessingService(db)
    count = 0
    for photo in unprocessed:
        service.queue_photo_for_processing(photo.id, "full")
        count += 1
    
    return {"queued": count}


@router.post("/queue-faces")
def queue_photos_for_face_processing(db: Session = Depends(get_db)):
    """Queue all photos that haven't had face processing for face detection."""
    photos_without_faces = db.query(Photo).filter(
        Photo.has_faces_processed == False,
        Photo.is_video == False
    ).all()
    
    service = ProcessingService(db)
    count = 0
    for photo in photos_without_faces:
        service.queue_photo_for_processing(photo.id, "faces")
        count += 1
    
    return {"queued": count, "message": f"Queued {count} photos for face detection"}


@router.post("/reprocess/{photo_id}")
def reprocess_photo(
    photo_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Reprocess a specific photo."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return {"error": "Photo not found"}
    
    service = ProcessingService(db)
    service.queue_photo_for_processing(photo_id, "full")
    db.commit()
    
    from app.core.config import get_settings
    settings = get_settings()
    
    background_tasks.add_task(run_processing_batch, settings.database_url, 1)
    
    return {"status": "queued", "photo_id": photo_id}


@router.get("/stats", response_model=LibraryStats)
def get_library_stats(db: Session = Depends(get_db)):
    """Get library statistics."""
    total_photos = db.query(Photo).filter(Photo.is_video == False).count()
    total_videos = db.query(Photo).filter(Photo.is_video == True).count()
    total_people = db.query(Person).count()
    total_pets = db.query(Pet).count()
    total_tags = db.query(Tag).count()
    processed = db.query(Photo).filter(Photo.is_processed == True).count()
    unprocessed = db.query(Photo).filter(Photo.is_processed == False).count()
    
    # Calculate storage size
    storage_result = db.query(func.sum(Photo.file_size)).scalar()
    storage_size = storage_result or 0
    
    return LibraryStats(
        total_photos=total_photos,
        total_videos=total_videos,
        total_people=total_people,
        total_pets=total_pets,
        total_tags=total_tags,
        processed_count=processed,
        unprocessed_count=unprocessed,
        storage_size_bytes=storage_size
    )


@router.post("/start-continuous")
def start_continuous_processing(
    max_items: int = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Start continuous background processing with progress tracking."""
    from app.core.config import get_settings
    settings = get_settings()
    
    state = get_processing_state()
    if state["is_running"]:
        return {"status": "already_running", "state": state}
    
    background_tasks.add_task(run_continuous_processing, settings.database_url, max_items)
    
    return {"status": "started", "max_items": max_items}


@router.post("/stop")
def stop_processing():
    """Stop the continuous processing."""
    request_stop_processing()
    return {"status": "stop_requested"}


@router.get("/progress")
def get_progress():
    """Get real-time processing progress."""
    state = get_processing_state()
    return {
        "is_running": state["is_running"],
        "current_photo": state["current_photo"],
        "current_step": state["current_step"],
        "processed": state["processed_count"],
        "total": state["total_count"],
        "speed": state["speed"],
        "percent": round(state["processed_count"] / state["total_count"] * 100, 1) if state["total_count"] > 0 else 0
    }


@router.post("/backfill-dates")
def backfill_dates(db: Session = Depends(get_db)):
    """Backfill date_taken from file modification date for photos without dates."""
    from datetime import datetime
    from pathlib import Path
    
    photos_without_dates = db.query(Photo).filter(Photo.date_taken == None).all()
    
    updated = 0
    for photo in photos_without_dates:
        try:
            file_path = Path(photo.file_path)
            if file_path.exists():
                file_modified = datetime.fromtimestamp(file_path.stat().st_mtime)
                photo.date_taken = file_modified
                updated += 1
        except Exception:
            pass
    
    db.commit()
    return {"updated": updated, "message": f"Updated {updated} photos with file modification dates"}


@router.post("/requeue-videos")
def requeue_videos(db: Session = Depends(get_db)):
    """Mark all videos as unprocessed so they can be reprocessed for thumbnails."""
    videos = db.query(Photo).filter(Photo.is_video == True).all()
    
    queued = 0
    for video in videos:
        video.is_processed = False
        video.thumbnail_small = None
        video.thumbnail_medium = None
        video.thumbnail_large = None
        
        # Remove any existing queue entries for this video
        db.query(ProcessingQueue).filter(ProcessingQueue.photo_id == video.id).delete()
        
        # Add to processing queue with proper task_type and status
        queue_item = ProcessingQueue(
            photo_id=video.id, 
            task_type="full",
            status="pending",
            priority=1
        )
        db.add(queue_item)
        queued += 1
    
    db.commit()
    return {"queued": queued, "message": f"Queued {queued} videos for reprocessing"}
