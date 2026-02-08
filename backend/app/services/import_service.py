import hashlib
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Generator
import exifread
from PIL import Image
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.models import Photo, ImportSource
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut

settings = get_settings()


class ImportService:
    """Service for importing photos from various sources."""
    
    def __init__(self, db: Session):
        self.db = db
        self.geolocator = Nominatim(user_agent="photo_organiser")
    
    def compute_file_hash(self, file_path: Path) -> str:
        """Compute SHA256 hash of a file."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def extract_exif(self, file_path: Path) -> dict:
        """Extract EXIF metadata from an image."""
        try:
            with open(file_path, "rb") as f:
                tags = exifread.process_file(f, details=False)
            
            exif_data = {}
            
            # Date taken
            date_keys = ["EXIF DateTimeOriginal", "EXIF DateTimeDigitized", "Image DateTime"]
            for key in date_keys:
                if key in tags:
                    try:
                        date_str = str(tags[key])
                        exif_data["date_taken"] = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                        break
                    except ValueError:
                        pass
            
            # GPS coordinates
            if "GPS GPSLatitude" in tags and "GPS GPSLongitude" in tags:
                lat = self._convert_gps_to_decimal(tags["GPS GPSLatitude"], tags.get("GPS GPSLatitudeRef"))
                lon = self._convert_gps_to_decimal(tags["GPS GPSLongitude"], tags.get("GPS GPSLongitudeRef"))
                if lat and lon:
                    exif_data["latitude"] = lat
                    exif_data["longitude"] = lon
            
            # Camera info
            if "Image Make" in tags:
                exif_data["camera_make"] = str(tags["Image Make"]).strip()
            if "Image Model" in tags:
                exif_data["camera_model"] = str(tags["Image Model"]).strip()
            
            # Dimensions
            if "EXIF ExifImageWidth" in tags:
                exif_data["width"] = int(str(tags["EXIF ExifImageWidth"]))
            if "EXIF ExifImageLength" in tags:
                exif_data["height"] = int(str(tags["EXIF ExifImageLength"]))
            
            return exif_data
        except Exception as e:
            print(f"Error extracting EXIF from {file_path}: {e}")
            return {}
    
    def _convert_gps_to_decimal(self, gps_coord, gps_ref) -> Optional[float]:
        """Convert GPS coordinates from EXIF format to decimal."""
        try:
            degrees = float(gps_coord.values[0].num) / float(gps_coord.values[0].den)
            minutes = float(gps_coord.values[1].num) / float(gps_coord.values[1].den)
            seconds = float(gps_coord.values[2].num) / float(gps_coord.values[2].den)
            
            decimal = degrees + (minutes / 60.0) + (seconds / 3600.0)
            
            if gps_ref and str(gps_ref) in ["S", "W"]:
                decimal = -decimal
            
            return decimal
        except Exception:
            return None
    
    def reverse_geocode(self, lat: float, lon: float) -> dict:
        """Reverse geocode coordinates to location name."""
        try:
            location = self.geolocator.reverse(f"{lat}, {lon}", language="en", timeout=5)
            if location and location.raw.get("address"):
                addr = location.raw["address"]
                return {
                    "location_name": location.address,
                    "city": addr.get("city") or addr.get("town") or addr.get("village"),
                    "country": addr.get("country")
                }
        except GeocoderTimedOut:
            pass
        except Exception as e:
            print(f"Geocoding error: {e}")
        return {}
    
    def get_image_dimensions(self, file_path: Path) -> tuple[int, int]:
        """Get image dimensions using PIL."""
        try:
            with Image.open(file_path) as img:
                return img.size
        except Exception:
            return (0, 0)
    
    def scan_directory(self, directory: Path) -> Generator[Path, None, None]:
        """Recursively scan directory for media files."""
        all_extensions = settings.image_extensions | settings.video_extensions
        
        for file_path in directory.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in all_extensions:
                yield file_path
    
    def import_file(
        self,
        file_path: Path,
        import_source: Optional[ImportSource] = None
    ) -> Optional[Photo]:
        """Import a single media file."""
        if not file_path.exists():
            return None
        
        # Check for duplicate
        file_hash = self.compute_file_hash(file_path)
        existing = self.db.query(Photo).filter(Photo.file_hash == file_hash).first()
        if existing:
            return None  # Duplicate
        
        # Determine if video
        is_video = file_path.suffix.lower() in settings.video_extensions
        
        # Extract metadata
        exif_data = {} if is_video else self.extract_exif(file_path)
        
        # Get dimensions
        if not is_video:
            width, height = self.get_image_dimensions(file_path)
            if "width" not in exif_data:
                exif_data["width"] = width
                exif_data["height"] = height
        
        # Reverse geocode if coordinates available
        location_data = {}
        if exif_data.get("latitude") and exif_data.get("longitude"):
            location_data = self.reverse_geocode(
                exif_data["latitude"],
                exif_data["longitude"]
            )
        
        # Create photo record
        # Use file modification date as fallback if no EXIF date_taken
        file_stat = file_path.stat()
        file_modified = datetime.fromtimestamp(file_stat.st_mtime)
        date_taken = exif_data.get("date_taken") or file_modified
        
        photo = Photo(
            file_path=str(file_path.absolute()),
            file_name=file_path.name,
            file_hash=file_hash,
            file_size=file_stat.st_size,
            mime_type=self._get_mime_type(file_path),
            is_video=is_video,
            width=exif_data.get("width"),
            height=exif_data.get("height"),
            date_taken=date_taken,
            date_modified=file_modified,
            latitude=exif_data.get("latitude"),
            longitude=exif_data.get("longitude"),
            location_name=location_data.get("location_name"),
            city=location_data.get("city"),
            country=location_data.get("country"),
            camera_make=exif_data.get("camera_make"),
            camera_model=exif_data.get("camera_model"),
            import_source=import_source
        )
        
        self.db.add(photo)
        return photo
    
    def _get_mime_type(self, file_path: Path) -> str:
        """Get MIME type based on file extension."""
        ext = file_path.suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".gif": "image/gif",
            ".webp": "image/webp", ".heic": "image/heic",
            ".heif": "image/heif", ".bmp": "image/bmp",
            ".tiff": "image/tiff",
            ".mp4": "video/mp4", ".mov": "video/quicktime",
            ".avi": "video/x-msvideo", ".mkv": "video/x-matroska",
            ".webm": "video/webm", ".m4v": "video/x-m4v"
        }
        return mime_types.get(ext, "application/octet-stream")
    
    def import_google_takeout(self, takeout_path: Path, import_source: ImportSource) -> int:
        """Import photos from Google Photos Takeout export."""
        imported_count = 0
        
        for file_path in self.scan_directory(takeout_path):
            # Skip JSON metadata files
            if file_path.suffix.lower() == ".json":
                continue
            
            # Look for companion JSON metadata
            json_path = file_path.with_suffix(file_path.suffix + ".json")
            google_metadata = None
            
            if json_path.exists():
                try:
                    with open(json_path) as f:
                        google_metadata = json.load(f)
                except Exception:
                    pass
            
            photo = self.import_file(file_path, import_source)
            
            if photo:
                # Add Google metadata if available
                if google_metadata:
                    photo.google_metadata = google_metadata
                    
                    # Extract Google's timestamp if no EXIF date
                    if not photo.date_taken and "photoTakenTime" in google_metadata:
                        try:
                            timestamp = int(google_metadata["photoTakenTime"]["timestamp"])
                            photo.date_taken = datetime.fromtimestamp(timestamp)
                        except (KeyError, ValueError):
                            pass
                    
                    # Extract Google's geo data if not in EXIF
                    if not photo.latitude and "geoData" in google_metadata:
                        geo = google_metadata["geoData"]
                        if geo.get("latitude") and geo.get("longitude"):
                            photo.latitude = geo["latitude"]
                            photo.longitude = geo["longitude"]
                            
                            # Reverse geocode
                            location_data = self.reverse_geocode(
                                photo.latitude, photo.longitude
                            )
                            photo.location_name = location_data.get("location_name")
                            photo.city = location_data.get("city")
                            photo.country = location_data.get("country")
                
                imported_count += 1
                
                if imported_count % 100 == 0:
                    self.db.commit()
        
        self.db.commit()
        return imported_count
