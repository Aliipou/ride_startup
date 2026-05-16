"""Ride & Chill — FastAPI application entry point."""

import base64
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Initialize Firebase if credentials are provided
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64:
        try:
            import firebase_admin
            from firebase_admin import credentials

            if not firebase_admin._apps:
                json_bytes = base64.b64decode(settings.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64)
                service_account = json.loads(json_bytes)
                cred = credentials.Certificate(service_account)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase initialized ✓")
        except Exception as e:
            logger.warning(f"Firebase init failed (push notifications disabled): {e}")
    else:
        logger.warning("FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 not set — push notifications disabled")

    logger.info("Ride & Chill API started ✓")
    yield
    logger.info("Ride & Chill API shutting down")


app = FastAPI(
    title="Ride & Chill API",
    description="Bike taxi platform for Kokkola, Finland",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "ride-and-chill-api"}


# ── Routers ───────────────────────────────────────────────────────────────────
from .routers import auth, rides, riders, wallet, promos, ratings, payments, users, admin, ws  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(rides.router, prefix="/rides", tags=["Rides"])
app.include_router(riders.router, prefix="/riders", tags=["Riders"])
app.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
app.include_router(promos.router, prefix="/promos", tags=["Promos"])
app.include_router(ratings.router, prefix="/ratings", tags=["Ratings"])
app.include_router(payments.router, prefix="/payments", tags=["Payments"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(ws.router, tags=["WebSocket"])
