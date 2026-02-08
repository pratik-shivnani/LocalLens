from fastapi import APIRouter
from app.api.routes import photos, search, people, import_routes, processing, tags

api_router = APIRouter()

api_router.include_router(photos.router)
api_router.include_router(search.router)
api_router.include_router(people.router)
api_router.include_router(import_routes.router)
api_router.include_router(processing.router)
api_router.include_router(tags.router)
