import os
import glob
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# On Windows, TorchCodec and torchaudio require FFmpeg shared DLLs.
# We MUST inject the path before any audio libraries are imported by the API routers.
if os.name == "nt":
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        search_pattern = os.path.join(
            local_app_data, 
            "Microsoft", "WinGet", "Packages", 
            "Gyan.FFmpeg.Shared*", "*", "bin"
        )
        for match in glob.glob(search_pattern):
            if os.path.isdir(match):
                try:
                    os.add_dll_directory(match)
                    print(f"Bootstrapped FFmpeg DLL directory: {match}")
                except Exception as e:
                    print(f"Failed to add DLL directory {match}: {e}")

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
