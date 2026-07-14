from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "ARIA Backend"
    debug: bool = True
    ollama_model: str = "llama3:latest"

    class Config:
        env_file = ".env"

settings = Settings()
