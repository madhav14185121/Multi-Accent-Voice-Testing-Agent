from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api import websocket, upload, feedback, history, tts
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

# CORS enabled
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])
app.include_router(history.router, prefix="/api", tags=["history"])
app.include_router(tts.router, prefix="/api", tags=["tts"])

@app.get("/")
async def health_check():
    return {"status": "running"}
