import os
from typing import Optional

VOICE_LABELS: list[str] = [
    "Indian English",
    "American English",
    "British English",
    "Australian English",
    "Canadian English"
]

VOICE_FILES = {
    "Indian English": "aria_indian.wav",
    "American English": "aria_american.wav",
    "British English": "aria_british.wav",
    "Australian English": "aria_australian.wav",
    "Canadian English": "aria_canadian.wav",
}

def resolve_voice_path(voice: Optional[str], accent: Optional[str], default: str) -> str:
    # Priority: detected accent -> explicit voice -> default
    target_label = accent or voice or default
    
    if target_label not in VOICE_LABELS:
        target_label = default
    
    filename = VOICE_FILES.get(target_label, "aria_indian.wav")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "voices", filename)
    
    if not os.path.exists(path):
        fallback_path = os.path.join(base_dir, "voices", "aria_indian.wav")
        if not os.path.exists(fallback_path):
            raise FileNotFoundError(f"Reference voice file not found at {path} and fallback {fallback_path} is also missing. Please add the required .wav files.")
        return fallback_path
    
    return path
