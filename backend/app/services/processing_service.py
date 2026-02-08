from pathlib import Path
from PIL import Image
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import threading
import subprocess
import tempfile
from app.core.config import get_settings
from app.db.models import Photo, Tag, Person, Face, ProcessingQueue
from app.db.database import get_image_collection, get_face_collection
from app.ml.clip_embeddings import get_clip_embedder
from app.ml.face_recognition import get_face_recognizer
from app.ml.auto_tagger import get_auto_tagger

settings = get_settings()

# Global processing state for progress tracking
_processing_state = {
    "is_running": False,
    "current_photo": None,
    "processed_count": 0,
    "total_count": 0,
    "current_step": "",
    "speed": 0.0,  # photos per second
    "stop_requested": False
}
_processing_lock = threading.Lock()

def get_processing_state() -> dict:
    with _processing_lock:
        return _processing_state.copy()

def request_stop_processing():
    global _processing_state
    with _processing_lock:
        _processing_state["stop_requested"] = True


class ProcessingService:
    """Service for processing photos (thumbnails, embeddings, faces, tags)."""
    
    def __init__(self, db: Session):
        self.db = db
        self.clip = get_clip_embedder()
        self.face_recognizer = get_face_recognizer()
        self.auto_tagger = get_auto_tagger()
        self.image_collection = get_image_collection()
        self.face_collection = get_face_collection()
    
    def extract_video_frame(self, video_path: Path) -> Image.Image | None:
        """Extract a frame from a video using ffmpeg."""
        try:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp_path = tmp.name
            
            # Extract frame at 1 second (or first frame if video is shorter)
            cmd = [
                'ffmpeg', '-y', '-i', str(video_path),
                '-ss', '00:00:01',  # Seek to 1 second
                '-vframes', '1',    # Extract 1 frame
                '-q:v', '2',        # High quality
                tmp_path
            ]
            
            result = subprocess.run(
                cmd, 
                capture_output=True, 
                timeout=30
            )
            
            if result.returncode != 0:
                # Try extracting first frame if seeking failed
                cmd = [
                    'ffmpeg', '-y', '-i', str(video_path),
                    '-vframes', '1',
                    '-q:v', '2',
                    tmp_path
                ]
                subprocess.run(cmd, capture_output=True, timeout=30)
            
            if Path(tmp_path).exists() and Path(tmp_path).stat().st_size > 0:
                img = Image.open(tmp_path)
                img.load()  # Load into memory before deleting temp file
                Path(tmp_path).unlink()
                return img
            
            Path(tmp_path).unlink(missing_ok=True)
            return None
        except Exception as e:
            print(f"Error extracting video frame: {e}")
            return None
    
    def generate_thumbnails(self, photo: Photo) -> bool:
        """Generate thumbnails for a photo or video."""
        try:
            source_path = Path(photo.file_path)
            if not source_path.exists():
                return False
            
            # Create thumbnail directory
            thumb_dir = Path(settings.thumbnail_path) / str(photo.id)
            thumb_dir.mkdir(parents=True, exist_ok=True)
            
            # Get image - either directly or extracted from video
            if photo.is_video:
                img = self.extract_video_frame(source_path)
                if img is None:
                    print(f"Failed to extract frame from video {photo.id}")
                    return False
            else:
                img = Image.open(source_path)
            
            with img:
                # Convert to RGB if needed
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                # Generate each size
                for size in settings.thumbnail_sizes:
                    thumb_path = thumb_dir / f"{size}.jpg"
                    
                    # Calculate aspect-preserving size
                    img_copy = img.copy()
                    img_copy.thumbnail((size, size), Image.Resampling.LANCZOS)
                    img_copy.save(thumb_path, "JPEG", quality=85)
                
                # Update photo record
                photo.thumbnail_small = str(thumb_dir / f"{settings.thumbnail_sizes[0]}.jpg")
                photo.thumbnail_medium = str(thumb_dir / f"{settings.thumbnail_sizes[1]}.jpg")
                photo.thumbnail_large = str(thumb_dir / f"{settings.thumbnail_sizes[2]}.jpg")
            
            return True
        except Exception as e:
            print(f"Error generating thumbnails for {photo.id}: {e}")
            return False
    
    def generate_embeddings(self, photo: Photo) -> bool:
        """Generate CLIP embeddings for a photo."""
        try:
            if photo.is_video:
                # TODO: Extract keyframes for videos
                return False
            
            embedding = self.clip.encode_image(photo.file_path)
            
            # Store in ChromaDB
            self.image_collection.add(
                ids=[str(photo.id)],
                embeddings=[embedding.tolist()],
                metadatas=[{"photo_id": photo.id, "file_path": photo.file_path}]
            )
            
            photo.has_embeddings = True
            return True
        except Exception as e:
            print(f"Error generating embeddings for {photo.id}: {e}")
            return False
    
    def process_faces(self, photo: Photo) -> int:
        """Detect and process faces in a photo."""
        try:
            if photo.is_video:
                return 0
            
            detections = self.face_recognizer.detect_faces(photo.file_path)
            
            for detection in detections:
                # Create face record
                embedding_id = str(uuid.uuid4())
                
                face = Face(
                    photo_id=photo.id,
                    bbox_x=detection.bbox[0],
                    bbox_y=detection.bbox[1],
                    bbox_width=detection.bbox[2],
                    bbox_height=detection.bbox[3],
                    confidence=detection.confidence,
                    age_estimate=detection.age,
                    gender_estimate=detection.gender,
                    embedding_id=embedding_id
                )
                self.db.add(face)
                
                # Store face embedding in ChromaDB
                self.face_collection.add(
                    ids=[embedding_id],
                    embeddings=[detection.embedding.tolist()],
                    metadatas=[{"photo_id": photo.id, "face_id": embedding_id}]
                )
                
                # Try to match with existing people
                self._match_face_to_person(face, detection.embedding)
            
            photo.has_faces_processed = True
            return len(detections)
        except Exception as e:
            print(f"Error processing faces for {photo.id}: {e}")
            return 0
    
    def _match_face_to_person(self, face: Face, embedding) -> None:
        """Try to match a face to an existing person or create a new one."""
        # Query similar faces from ChromaDB
        results = self.face_collection.query(
            query_embeddings=[embedding.tolist()],
            n_results=10
        )
        
        if not results["ids"] or not results["ids"][0]:
            # No similar faces found, create a new person
            self._create_person_for_face(face)
            return
        
        # Find the best matching face that belongs to a person
        best_match_person_id = None
        best_distance = 1.0
        
        for face_id, distance in zip(results["ids"][0], results["distances"][0]):
            if face_id == face.embedding_id:
                continue
            
            # Similarity threshold (cosine distance < 0.6 means similar)
            if distance < 0.6 and distance < best_distance:
                existing_face = self.db.query(Face).filter(
                    Face.embedding_id == face_id
                ).first()
                
                if existing_face and existing_face.person_id:
                    best_match_person_id = existing_face.person_id
                    best_distance = distance
        
        if best_match_person_id:
            face.person_id = best_match_person_id
            
            # Update person photo count and add photo to person
            person = self.db.query(Person).filter(Person.id == best_match_person_id).first()
            if person:
                photo = self.db.query(Photo).filter(Photo.id == face.photo_id).first()
                if photo and photo not in person.photos:
                    person.photos.append(photo)
                    person.photo_count = len(person.photos)
        else:
            # No matching person found, create a new one
            self._create_person_for_face(face)
    
    def _create_person_for_face(self, face: Face) -> Person:
        """Create a new person for an unmatched face."""
        person = Person(
            is_named=False,
            representative_face_id=face.id,
            photo_count=1
        )
        self.db.add(person)
        self.db.flush()
        
        face.person_id = person.id
        
        # Add photo to person
        photo = self.db.query(Photo).filter(Photo.id == face.photo_id).first()
        if photo:
            person.photos.append(photo)
        
        return person
    
    def generate_tags(self, photo: Photo) -> list[str]:
        """Generate automatic tags for a photo."""
        try:
            if photo.is_video:
                return []
            
            # Lower threshold for screenshots/UI images
            predictions = self.auto_tagger.predict_tags(photo.file_path, threshold=0.18, top_k=8)
            
            tag_names = []
            for pred in predictions:
                # Get or create tag
                tag = self.db.query(Tag).filter(Tag.name == pred.name).first()
                if not tag:
                    tag = Tag(name=pred.name, category=pred.category)
                    self.db.add(tag)
                    self.db.flush()  # Ensure tag has ID before adding to relationship
                
                if tag not in photo.tags:
                    photo.tags.append(tag)
                tag_names.append(pred.name)
            
            self.db.flush()  # Ensure relationship is persisted
            return tag_names
        except Exception as e:
            print(f"Error generating tags for {photo.id}: {e}")
            return []
    
    def process_photo_full(self, photo: Photo) -> dict:
        """Run full processing pipeline on a photo."""
        results = {
            "thumbnails": False,
            "embeddings": False,
            "faces": 0,
            "tags": []
        }
        
        # Generate thumbnails
        results["thumbnails"] = self.generate_thumbnails(photo)
        
        # Generate embeddings
        results["embeddings"] = self.generate_embeddings(photo)
        
        # Process faces
        results["faces"] = self.process_faces(photo)
        
        # Generate tags
        results["tags"] = self.generate_tags(photo)
        
        photo.is_processed = True
        self.db.commit()
        
        return results
    
    def queue_photo_for_processing(self, photo_id: int, task_type: str = "full") -> None:
        """Add a photo to the processing queue."""
        queue_item = ProcessingQueue(
            photo_id=photo_id,
            task_type=task_type,
            status="pending"
        )
        self.db.add(queue_item)
        self.db.commit()
    
    def process_queue(self, batch_size: int = 10) -> int:
        """Process items from the queue."""
        items = self.db.query(ProcessingQueue).filter(
            ProcessingQueue.status == "pending"
        ).order_by(ProcessingQueue.priority.desc()).limit(batch_size).all()
        
        processed = 0
        for item in items:
            item.status = "processing"
            item.started_at = datetime.utcnow()
            self.db.commit()
            
            try:
                photo = self.db.query(Photo).filter(Photo.id == item.photo_id).first()
                if photo:
                    if item.task_type == "full":
                        self.process_photo_full(photo)
                    elif item.task_type == "thumbnails":
                        self.generate_thumbnails(photo)
                    elif item.task_type == "embeddings":
                        self.generate_embeddings(photo)
                    elif item.task_type == "faces":
                        self.process_faces(photo)
                    elif item.task_type == "tags":
                        self.generate_tags(photo)
                    
                    self.db.commit()
                
                item.status = "completed"
                item.completed_at = datetime.utcnow()
                processed += 1
            except Exception as e:
                item.status = "failed"
                item.error_message = str(e)
            
            self.db.commit()
        
        return processed
    
    def process_continuous(self, max_items: int = None) -> int:
        """Process all pending items continuously with progress tracking."""
        global _processing_state
        import time
        
        with _processing_lock:
            if _processing_state["is_running"]:
                return 0
            _processing_state["is_running"] = True
            _processing_state["stop_requested"] = False
            _processing_state["processed_count"] = 0
        
        total = self.db.query(ProcessingQueue).filter(
            ProcessingQueue.status == "pending"
        ).count()
        
        if max_items:
            total = min(total, max_items)
        
        with _processing_lock:
            _processing_state["total_count"] = total
        
        processed = 0
        start_time = time.time()
        
        while True:
            with _processing_lock:
                if _processing_state["stop_requested"]:
                    break
            
            if max_items and processed >= max_items:
                break
            
            item = self.db.query(ProcessingQueue).filter(
                ProcessingQueue.status == "pending"
            ).order_by(ProcessingQueue.priority.desc()).first()
            
            if not item:
                break
            
            item.status = "processing"
            item.started_at = datetime.utcnow()
            self.db.commit()
            
            try:
                photo = self.db.query(Photo).filter(Photo.id == item.photo_id).first()
                if photo:
                    with _processing_lock:
                        _processing_state["current_photo"] = photo.file_name
                    
                    # Process based on task type
                    with _processing_lock:
                        _processing_state["current_step"] = "thumbnails"
                    self.generate_thumbnails(photo)
                    
                    with _processing_lock:
                        _processing_state["current_step"] = "embeddings"
                    self.generate_embeddings(photo)
                    
                    with _processing_lock:
                        _processing_state["current_step"] = "faces"
                    self.process_faces(photo)
                    
                    with _processing_lock:
                        _processing_state["current_step"] = "tags"
                    self.generate_tags(photo)
                    
                    photo.is_processed = True
                    self.db.commit()
                
                item.status = "completed"
                item.completed_at = datetime.utcnow()
                processed += 1
                
                # Update progress
                elapsed = time.time() - start_time
                speed = processed / elapsed if elapsed > 0 else 0
                
                with _processing_lock:
                    _processing_state["processed_count"] = processed
                    _processing_state["speed"] = round(speed, 2)
                    
            except Exception as e:
                item.status = "failed"
                item.error_message = str(e)
                print(f"Processing error for {item.photo_id}: {e}")
            
            self.db.commit()
        
        with _processing_lock:
            _processing_state["is_running"] = False
            _processing_state["current_photo"] = None
            _processing_state["current_step"] = ""
        
        return processed
