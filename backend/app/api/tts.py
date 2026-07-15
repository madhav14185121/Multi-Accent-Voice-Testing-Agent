import asyncio
import base64
import wave
import io
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tts import xtts_service, resolve_voice_path
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None
    accent: Optional[str] = None

@router.post("/tts")
async def synthesize_speech(req: TTSRequest):
    try:
        path = resolve_voice_path(voice=req.voice, accent=req.accent, default=settings.tts_default_voice)
        
        wav_bytes, sample_rate = await asyncio.to_thread(
            xtts_service.synthesize, req.text, path, settings.tts_language
        )
        
        # Compute duration using wave module
        duration_ms = 0
        try:
            with wave.open(io.BytesIO(wav_bytes), 'rb') as w:
                frames = w.getnframes()
                rate = w.getframerate()
                duration_ms = int(frames / rate * 1000)
        except Exception as e:
            logger.warning(f"Could not read wav duration: {e}")
            duration_ms = int(len(wav_bytes) / (sample_rate * 2) * 1000) # Fallback

        logger.info(f"TTS POST request completed for text length {len(req.text)}")

        return {
            "success": True,
            "audio_base64": base64.b64encode(wav_bytes).decode("utf-8"),
            "mime_type": "audio/wav",
            "sample_rate": sample_rate,
            "duration_ms": duration_ms,
            "voice_used": path
        }

    except Exception as e:
        logger.error(f"TTS API failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
