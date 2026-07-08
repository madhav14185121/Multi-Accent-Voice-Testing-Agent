from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from app.services.accent.detector import accent_detector

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    # Validate extension
    allowed_extensions = [".wav", ".mp3", ".m4a"]
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Invalid file extension. Only .wav, .mp3, and .m4a are allowed.")
    
    # Read bytes and validate size
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 25 MB.")
        
    try:
        # Call detector
        result = accent_detector.detect(audio_bytes, filename)
        
        # Log the detected accent and confidence
        logger.info(f"Detected accent: {result['accent']} with {result['confidence']}% confidence.")
        
        return {
            "success": True,
            "filename": filename,
            **result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing audio upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
