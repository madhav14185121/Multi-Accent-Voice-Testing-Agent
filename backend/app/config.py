from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "ARIA Backend"
    debug: bool = True
    ollama_model: str = "llama3:latest"
    
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_bucket: str = "audio-uploads"

    tts_default_voice: str = "Indian English"
    tts_language: str = "en"
    tts_device: Optional[str] = None  # None = auto-detect

    model_config = {"env_file": ".env", "extra": "ignore"}
settings = Settings()
