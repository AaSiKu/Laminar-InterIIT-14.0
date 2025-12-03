from fastapi import APIRouter
from .auth.routes import router as auth_router
from .version_manager.routes import router as version_control_router
from .connectors.whatsapp import router as whatsapp_router
from .pipelines import router as pipelines_router
from .schemas import router as schemas_router
from .websocket import router as websocket_router
from .overview import router as overview_router
from .book import router as book_router
router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(version_control_router, prefix="/version", tags=["version"])
router.include_router(whatsapp_router, prefix="/connectors/whatsapp", tags=["whatsapp"])
router.include_router(pipelines_router, prefix="/pipelines", tags=["pipelines"])
router.include_router(schemas_router, prefix="/schema", tags=["schemas"])
router.include_router(websocket_router, prefix="/ws", tags=["websocket"])
router.include_router(overview_router, prefix="/overview", tags=["overview"])
router.include_router(book_router, prefix="/book", tags=["book"])
