import logging
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI

from src.config.settings import get_settings
from src.routers import health

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info(
        "rag-engine starting",
        chat_model=settings.openai_chat_model,
        embedding_model=settings.openai_embedding_model,
        qdrant_url=settings.qdrant_url,
        collection=settings.qdrant_collection_name,
    )
    yield
    logger.info("rag-engine shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="jobabai rag-engine",
        version="0.1.0",
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
        lifespan=lifespan,
    )

    # /health — no auth required
    app.include_router(health.router)

    # Protected routers (embed, respond, risk-score) added in RE-M1..M3

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.port, reload=True)
