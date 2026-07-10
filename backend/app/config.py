from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "ARIA Backend"
    debug: bool = True
    
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_bucket: str = "audio-uploads"

    class Config:
        env_file = ".env"

settings = Settings()
