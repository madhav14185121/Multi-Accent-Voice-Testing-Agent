from fastapi import APIRouter, UploadFile, File, HTTPException
import logging
from app.services.accent.detector import accent_detector
from app.services.storage.supabase_client import supabase_service
import uuid
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
        
        # Supabase Integration
        file_url = None
        report_id = None
        
        try:
            import time
            unique_filename = f"{uuid.uuid4()}_{int(time.time())}_{filename}"
            
            content_type = "audio/wav"
            if filename.lower().endswith(".mp3"):
                content_type = "audio/mpeg"
            elif filename.lower().endswith(".m4a"):
                content_type = "audio/mp4"

            file_url = supabase_service.upload_audio(audio_bytes, unique_filename, content_type)
            
            accent_scores = {}
            if "top3" in result:
                for item in result["top3"]:
                    accent_scores[item["label"]] = item["confidence"]
            
            report_data = {
                "file_name": filename,
                "file_url": file_url,
                "file_duration": result.get("duration_seconds", 0.0),
                "predicted_accent": result["accent"],
                "confidence": result["confidence"],
                "accent_scores": accent_scores,
                "telemetry": {}
            }
            
            saved_report = supabase_service.save_report(report_data)
            if saved_report and "id" in saved_report:
                report_id = saved_report["id"]
        except Exception as e:
            logger.error(f"Supabase integration failed: {e}")
            
        return {
            "success": True,
            "filename": filename,
            "file_url": file_url,
            "report_id": report_id,
            **result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing audio upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
