from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime
from app.db.models import Photo, Tag, Person, Pet
from app.db.database import get_image_collection
from app.ml.clip_embeddings import get_clip_embedder


class SearchService:
    """Service for searching photos using various criteria."""
    
    def __init__(self, db: Session):
        self.db = db
        self.clip = get_clip_embedder()
        self.image_collection = get_image_collection()
    
    def semantic_search(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0
    ) -> list[Photo]:
        """Search photos using natural language query via CLIP."""
        # Encode the text query
        query_embedding = self.clip.encode_text(query)
        
        # Search in ChromaDB
        results = self.image_collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=limit + offset
        )
        
        if not results["ids"] or not results["ids"][0]:
            return []
        
        # Get photo IDs from results (stored as metadata)
        photo_ids = []
        for i, metadata in enumerate(results["metadatas"][0]):
            if i >= offset:
                photo_ids.append(metadata.get("photo_id"))
        
        photo_ids = photo_ids[:limit]
        
        # Fetch photos from database maintaining order
        photos = self.db.query(Photo).filter(Photo.id.in_(photo_ids)).all()
        
        # Sort by the order returned from ChromaDB
        id_to_photo = {p.id: p for p in photos}
        return [id_to_photo[pid] for pid in photo_ids if pid in id_to_photo]
    
    def filter_search(
        self,
        people_ids: Optional[list[int]] = None,
        pet_ids: Optional[list[int]] = None,
        tag_names: Optional[list[str]] = None,
        location: Optional[str] = None,
        country: Optional[str] = None,
        city: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        is_video: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> list[Photo]:
        """Search photos using filters."""
        query = self.db.query(Photo)
        
        # Filter by people
        if people_ids:
            query = query.filter(Photo.people.any(Person.id.in_(people_ids)))
        
        # Filter by pets
        if pet_ids:
            query = query.filter(Photo.pets.any(Pet.id.in_(pet_ids)))
        
        # Filter by tags
        if tag_names:
            query = query.filter(Photo.tags.any(Tag.name.in_(tag_names)))
        
        # Filter by location (text search)
        if location:
            location_filter = or_(
                Photo.location_name.ilike(f"%{location}%"),
                Photo.city.ilike(f"%{location}%"),
                Photo.country.ilike(f"%{location}%")
            )
            query = query.filter(location_filter)
        
        if country:
            query = query.filter(Photo.country.ilike(f"%{country}%"))
        
        if city:
            query = query.filter(Photo.city.ilike(f"%{city}%"))
        
        # Filter by date range
        if date_from:
            query = query.filter(Photo.date_taken >= date_from)
        if date_to:
            query = query.filter(Photo.date_taken <= date_to)
        
        # Filter by media type
        if is_video is not None:
            query = query.filter(Photo.is_video == is_video)
        
        # Order by date taken (newest first)
        query = query.order_by(Photo.date_taken.desc())
        
        return query.offset(offset).limit(limit).all()
    
    def combined_search(
        self,
        text_query: Optional[str] = None,
        people_ids: Optional[list[int]] = None,
        pet_ids: Optional[list[int]] = None,
        tag_names: Optional[list[str]] = None,
        location: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> list[Photo]:
        """Combined semantic and filter search."""
        # If no text query, use filter search only
        if not text_query:
            return self.filter_search(
                people_ids=people_ids,
                pet_ids=pet_ids,
                tag_names=tag_names,
                location=location,
                date_from=date_from,
                date_to=date_to,
                limit=limit,
                offset=offset
            )
        
        # Get semantic search results (get more to allow for filtering)
        semantic_results = self.semantic_search(text_query, limit=limit * 3)
        
        if not semantic_results:
            return []
        
        # Apply filters to semantic results
        photo_ids = [p.id for p in semantic_results]
        query = self.db.query(Photo).filter(Photo.id.in_(photo_ids))
        
        if people_ids:
            query = query.filter(Photo.people.any(Person.id.in_(people_ids)))
        
        if pet_ids:
            query = query.filter(Photo.pets.any(Pet.id.in_(pet_ids)))
        
        if tag_names:
            query = query.filter(Photo.tags.any(Tag.name.in_(tag_names)))
        
        if location:
            location_filter = or_(
                Photo.location_name.ilike(f"%{location}%"),
                Photo.city.ilike(f"%{location}%"),
                Photo.country.ilike(f"%{location}%")
            )
            query = query.filter(location_filter)
        
        if date_from:
            query = query.filter(Photo.date_taken >= date_from)
        if date_to:
            query = query.filter(Photo.date_taken <= date_to)
        
        # Maintain semantic search order
        filtered_photos = query.all()
        id_order = {p.id: i for i, p in enumerate(semantic_results)}
        filtered_photos.sort(key=lambda p: id_order.get(p.id, float('inf')))
        
        return filtered_photos[offset:offset + limit]
    
    def get_suggestions(self, partial_query: str, limit: int = 10) -> dict:
        """Get search suggestions based on partial query."""
        suggestions = {
            "people": [],
            "pets": [],
            "tags": [],
            "locations": []
        }
        
        # People suggestions
        people = self.db.query(Person).filter(
            Person.name.ilike(f"%{partial_query}%"),
            Person.is_named == True
        ).limit(limit).all()
        suggestions["people"] = [{"id": p.id, "name": p.name} for p in people]
        
        # Pet suggestions
        pets = self.db.query(Pet).filter(
            Pet.name.ilike(f"%{partial_query}%"),
            Pet.is_named == True
        ).limit(limit).all()
        suggestions["pets"] = [{"id": p.id, "name": p.name, "species": p.species} for p in pets]
        
        # Tag suggestions
        tags = self.db.query(Tag).filter(
            Tag.name.ilike(f"%{partial_query}%")
        ).limit(limit).all()
        suggestions["tags"] = [{"id": t.id, "name": t.name, "category": t.category} for t in tags]
        
        # Location suggestions (distinct cities/countries)
        cities = self.db.query(Photo.city).filter(
            Photo.city.ilike(f"%{partial_query}%"),
            Photo.city.isnot(None)
        ).distinct().limit(limit).all()
        suggestions["locations"] = [c[0] for c in cities if c[0]]
        
        return suggestions
