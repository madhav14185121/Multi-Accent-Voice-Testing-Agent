import os
import time
import tempfile
import logging
import torch
from TTS.api import TTS

from app.config import settings

logger = logging.getLogger(__name__)

class XTTSService:
    def __init__(self):
        self.tts = None
        self._device = settings.tts_device

    def _detect_device(self) -> str:
        """Detect the best available compute device."""
        if self._device is not None:
            return self._device
        if torch.cuda.is_available():
            return "cuda"
        if torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    def _load_model(self):
        if self.tts is None:
            device = self._detect_device()
            logger.info(f"Loading XTTS v2 model on device: {device}...")
            # Init TTS
            self.tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
            logger.info("XTTS v2 model loaded successfully.")

    def synthesize(self, text: str, speaker_wav: str, language: str = "en") -> tuple[bytes, int]:
        if not text or not text.strip():
            raise ValueError("Text for synthesis cannot be empty.")

        self._load_model()
        
        # We need a temp file because TTS.tts_to_file requires writing to disk
        fd, temp_path = tempfile.mkstemp(suffix=".wav")
        os.close(fd)
        
        try:
            t_start = time.time()
            with torch.inference_mode():
                self.tts.tts_to_file(
                    text=text,
                    speaker_wav=speaker_wav,
                    language=language,
                    file_path=temp_path
                )
            latency_ms = int((time.time() - t_start) * 1000)
            logger.info(f"XTTS synthesis completed in {latency_ms}ms")
            
            with open(temp_path, "rb") as f:
                wav_bytes = f.read()
            
            # The XTTS model usually outputs at 24000Hz.
            # We can hardcode or attempt to read the header. 24000 is safe for XTTSv2.
            sample_rate = 24000 
            
            return wav_bytes, sample_rate
            
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

xtts_service = XTTSService()
