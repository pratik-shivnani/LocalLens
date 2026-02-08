from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pathlib import Path
from app.db.database import get_db
from app.db.models import ImportSource, Photo
from app.api.schemas import ImportRequest, ImportSourceResponse, ImportProgress
from app.services.import_service import ImportService
from app.services.processing_service import ProcessingService

router = APIRouter(prefix="/import", tags=["import"])


def process_import_background(
    source_id: int,
    source_path: str,
    source_type: str,
    db_url: str
):
    """Background task for importing photos."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        import_source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
        if not import_source:
            return
        
        import_source.status = "processing"
        db.commit()
        
        import_service = ImportService(db)
        processing_service = ProcessingService(db)
        
        path = Path(source_path)
        
        if source_type == "google_takeout":
            count = import_service.import_google_takeout(path, import_source)
        else:
            count = 0
            for file_path in import_service.scan_directory(path):
                photo = import_service.import_file(file_path, import_source)
                if photo:
                    # Commit to get photo.id before queuing
                    db.commit()
                    db.refresh(photo)
                    count += 1
                    # Queue for processing
                    processing_service.queue_photo_for_processing(photo.id)
        
        import_source.photo_count = count
        import_source.status = "completed"
        db.commit()
        
    except Exception as e:
        import_source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
        if import_source:
            import_source.status = "failed"
            db.commit()
        print(f"Import error: {e}")
    finally:
        db.close()


@router.post("/", response_model=ImportSourceResponse)
def start_import(
    request: ImportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start importing photos from a source."""
    source_path = Path(request.source_path)
    
    if not source_path.exists():
        raise HTTPException(status_code=400, detail="Source path does not exist")
    
    if not source_path.is_dir():
        raise HTTPException(status_code=400, detail="Source path must be a directory")
    
    # Create import source record
    import_source = ImportSource(
        name=request.name or source_path.name,
        source_type=request.source_type,
        source_path=str(source_path.absolute()),
        status="pending"
    )
    db.add(import_source)
    db.commit()
    db.refresh(import_source)
    
    # Start background import
    from app.core.config import get_settings
    settings = get_settings()
    
    background_tasks.add_task(
        process_import_background,
        import_source.id,
        str(source_path.absolute()),
        request.source_type,
        settings.database_url
    )
    
    return import_source


@router.get("/sources", response_model=list[ImportSourceResponse])
def list_import_sources(db: Session = Depends(get_db)):
    """List all import sources."""
    return db.query(ImportSource).order_by(ImportSource.date_imported.desc()).all()


@router.get("/sources/{source_id}", response_model=ImportSourceResponse)
def get_import_source(source_id: int, db: Session = Depends(get_db)):
    """Get import source details."""
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Import source not found")
    return source


@router.get("/sources/{source_id}/progress", response_model=ImportProgress)
def get_import_progress(source_id: int, db: Session = Depends(get_db)):
    """Get import progress."""
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Import source not found")
    
    # Count photos imported so far
    processed = db.query(Photo).filter(Photo.import_source_id == source_id).count()
    
    return ImportProgress(
        source_id=source_id,
        total_files=source.photo_count or 0,
        processed_files=processed,
        status=source.status
    )


@router.delete("/sources/{source_id}")
def delete_import_source(
    source_id: int,
    delete_photos: bool = False,
    db: Session = Depends(get_db)
):
    """Delete import source record (optionally delete associated photos)."""
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Import source not found")
    
    if delete_photos:
        db.query(Photo).filter(Photo.import_source_id == source_id).delete()
    
    db.delete(source)
    db.commit()
    
    return {"status": "deleted", "source_id": source_id}
