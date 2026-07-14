from fastapi import APIRouter, HTTPException
import logging
from app.services.storage.supabase_client import supabase_service

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/history")
async def get_history(limit: int = 50):
    try:
        reports = supabase_service.list_reports(limit)
        return {"success": True, "reports": reports}
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@router.get("/history/{report_id}")
async def get_report(report_id: str):
    try:
        report = supabase_service.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"success": True, "report": report}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch report")

@router.delete("/history/{report_id}")
async def delete_report(report_id: str):
    try:
        success = supabase_service.delete_report(report_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete report")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete report")
