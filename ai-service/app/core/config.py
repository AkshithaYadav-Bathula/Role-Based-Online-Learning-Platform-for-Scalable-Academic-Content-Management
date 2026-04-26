from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("AI_SERVICE_NAME", "LMS AI Service")
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "800"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "120"))
    top_k: int = int(os.getenv("TOP_K", "4"))
    general_fallback_enabled: bool = os.getenv("GENERAL_FALLBACK_ENABLED", "true").lower() == "true"


settings = Settings()
