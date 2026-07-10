import logging
from supabase import create_client, Client
from app.config import settings
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

class SupabaseService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.bucket_name = settings.supabase_bucket
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        url = settings.supabase_url
        key = settings.supabase_service_role_key
        if not url or not key:
            logger.warning("Supabase URL or Key is missing. SupabaseService will be disabled.")
            return

        try:
            self.client: Client = create_client(url, key)
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")

    def upload_audio(self, file_bytes: bytes, file_name: str, content_type: str = "audio/wav") -> Optional[str]:
        if not self.client:
            return None
        
        try:
            # Upload file
            self.client.storage.from_(self.bucket_name).upload(
                path=file_name,
                file=file_bytes,
                file_options={"content-type": content_type}
            )
            # Get public url
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(file_name)
            return public_url
        except Exception as e:
            logger.error(f"Failed to upload audio to Supabase: {e}")
            return None

    def save_report(self, report: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not self.client:
            return None
        
        try:
            res = self.client.table("accent_reports").insert(report).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to save report to Supabase: {e}")
            return None

    def list_reports(self, limit: int = 50) -> List[Dict[str, Any]]:
        if not self.client:
            return []
            
        try:
            res = self.client.table("accent_reports").select("*").order("created_at", desc=True).limit(limit).execute()
            return res.data
        except Exception as e:
            logger.error(f"Failed to list reports from Supabase: {e}")
            return []

    def get_report(self, report_id: str) -> Optional[Dict[str, Any]]:
        if not self.client:
            return None
            
        try:
            res = self.client.table("accent_reports").select("*").eq("id", report_id).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get report {report_id} from Supabase: {e}")
            return None

    def delete_report(self, report_id: str) -> bool:
        if not self.client:
            return False
            
        try:
            self.client.table("accent_reports").delete().eq("id", report_id).execute()
            return True
        except Exception as e:
            logger.error(f"Failed to delete report {report_id} from Supabase: {e}")
            return False

supabase_service = SupabaseService()
