"""
Faster-Whisper transcription service.

Pure transcription service — receives a pre-normalized WAV path
and returns text. All audio preprocessing (format conversion,
normalization) is handled upstream by AudioProcessor.
"""

import logging
import os
import time
from typing import Optional

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)


class WhisperTranscriber:
    """Singleton Speech-to-Text service using Faster-Whisper.

    Loads the model lazily on first use. Automatically selects
    CUDA if available, otherwise falls back to CPU.

    This service only performs transcription. It expects a
    normalized WAV file (16kHz, mono, PCM) from AudioProcessor.
    """

    _instance: Optional["WhisperTranscriber"] = None
    _initialized: bool = False

    def __new__(cls) -> "WhisperTranscriber":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if WhisperTranscriber._initialized:
            return
        self._model: Optional[WhisperModel] = None
        WhisperTranscriber._initialized = True
        logger.info("WhisperTranscriber singleton created (model not yet loaded).")

    def _ensure_model(self) -> WhisperModel:
        """Lazily load the Whisper model on first transcription call."""
        if self._model is None:
            device, compute_type = self._detect_device()
            logger.info(
                f"Loading Faster-Whisper 'distil-small.en' model on {device} "
                f"(compute_type={compute_type})..."
            )
            start = time.time()
            self._model = WhisperModel(
                "distil-small.en",
                device=device,
                compute_type=compute_type,
            )
            elapsed = time.time() - start
            logger.info(f"Whisper model loaded in {elapsed:.1f}s.")
        return self._model

    @staticmethod
    def _detect_device() -> tuple[str, str]:
        """Detect best available device and compute type.

        Returns:
            Tuple of (device, compute_type).
        """
        try:
            import torch
            if torch.cuda.is_available():
                logger.info("CUDA detected — using GPU acceleration.")
                return "cuda", "float16"
        except ImportError:
            pass
        logger.info("CUDA not available — falling back to CPU.")
        return "cpu", "int8"

    def transcribe(self, audio_path: str) -> str:
        """Transcribe a normalized WAV audio file to text.

        Args:
            audio_path: Absolute path to a 16kHz mono PCM WAV file.

        Returns:
            Transcribed text as a single string.
        """
        model = self._ensure_model()

        logger.info(f"Transcription started for: {os.path.basename(audio_path)}")
        start = time.time()

        segments, info = model.transcribe(
            audio_path,
            beam_size=3,
            language="en",
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=800,
                speech_pad_ms=600,
            ),
            condition_on_previous_text=True,
        )
        text_parts = [segment.text for segment in segments]
        transcript = " ".join(text_parts).strip()

        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            f"Transcription finished — "
            f"latency: {elapsed_ms:.0f}ms, "
            f"length: {len(transcript)} chars."
        )
        return transcript


# Module-level singleton instance
transcriber = WhisperTranscriber()
