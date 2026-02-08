from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from app.db.database import get_db
from app.api.schemas import SearchQuery, PhotoResponse, SearchSuggestions
from app.services.search_service import SearchService

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/", response_model=list[PhotoResponse])
def search_photos(query: SearchQuery, db: Session = Depends(get_db)):
    """Search photos using text query and/or filters."""
    service = SearchService(db)
    
    photos = service.combined_search(
        text_query=query.text,
        people_ids=query.people_ids,
        pet_ids=query.pet_ids,
        tag_names=query.tag_names,
        location=query.location or query.city or query.country,
        date_from=query.date_from,
        date_to=query.date_to,
        limit=query.limit,
        offset=query.offset
    )
    
    return photos


@router.get("/semantic", response_model=list[PhotoResponse])
def semantic_search(
    q: str = Query(..., description="Natural language search query"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search photos using natural language (CLIP-based semantic search)."""
    service = SearchService(db)
    return service.semantic_search(q, limit=limit, offset=offset)


@router.get("/filter", response_model=list[PhotoResponse])
def filter_search(
    people: Optional[str] = Query(None, description="Comma-separated person IDs"),
    pets: Optional[str] = Query(None, description="Comma-separated pet IDs"),
    tags: Optional[str] = Query(None, description="Comma-separated tag names"),
    location: Optional[str] = None,
    country: Optional[str] = None,
    city: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    is_video: Optional[bool] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Search photos using filters only."""
    service = SearchService(db)
    
    people_ids = [int(x) for x in people.split(",")] if people else None
    pet_ids = [int(x) for x in pets.split(",")] if pets else None
    tag_names = tags.split(",") if tags else None
    
    return service.filter_search(
        people_ids=people_ids,
        pet_ids=pet_ids,
        tag_names=tag_names,
        location=location,
        country=country,
        city=city,
        date_from=date_from,
        date_to=date_to,
        is_video=is_video,
        limit=limit,
        offset=offset
    )


@router.get("/suggestions", response_model=SearchSuggestions)
def get_suggestions(
    q: str = Query(..., min_length=1, description="Partial search query"),
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db)
):
    """Get search suggestions based on partial query."""
    service = SearchService(db)
    return service.get_suggestions(q, limit=limit)
