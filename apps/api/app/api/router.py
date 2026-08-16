from fastapi import APIRouter

from app.api.routes.activity import router as activity_router
from app.api.routes.agents import router as agents_router
from app.api.routes.businesses import router as businesses_router
from app.api.routes.goals import router as goals_router
from app.api.routes.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
# Product API routes live under /api.
api_router.include_router(businesses_router, prefix="/api")
api_router.include_router(goals_router, prefix="/api")
api_router.include_router(activity_router, prefix="/api")
api_router.include_router(agents_router, prefix="/api")
