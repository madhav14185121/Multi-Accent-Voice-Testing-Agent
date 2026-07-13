"""
Audio processor — the sole owner of audio preprocessing in ARIA.

Receives raw WebM bytes from the WebSocket layer, converts to a
normalized 16kHz mono PCM WAV, and returns an AudioPipelineContext
that every downstream AI service can consume.

No other module should call FFmpeg or handle format conversion.
"""

import logging
import os
import subprocess
import tempfile
import time
import wave
from datetime import datetime, timezone
from typing import Optional

from app.services.audio.context import AudioPipelineContext

logger = logging.getLogger(__name__)


class AudioProcessor:
    """Singleton service for audio preprocessing.

    Converts raw WebM bytes into normalized WAV files suitable for
    all AI services (STT, accent detection, analytics). Produces
    an AudioPipelineContext that flows through the rest of the pipeline.
    """

    _instance: Optional["AudioProcessor"] = None

    def __new__(cls) -> "AudioProcessor":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def process(self, webm_bytes: bytes, session_id: str) -> AudioPipelineContext:
        """Convert raw WebM bytes to a normalized WAV and return a pipeline context.

        Args:
            webm_bytes: Raw audio bytes from MediaRecorder (audio/webm).
            session_id: The session this audio belongs to.

        Returns:
            AudioPipelineContext with wav_path pointing to a 16kHz mono WAV.

        Raises:
            ValueError: If audio data is empty or too small.
            RuntimeError: If FFmpeg conversion fails.
        """
        received_at = datetime.now(timezone.utc).isoformat()

        # ── Validate ───────────────────────────────────────────────────
        if not webm_bytes or len(webm_bytes) < 100:
            raise ValueError(
                f"Audio data too small ({len(webm_bytes) if webm_bytes else 0} bytes). "
                "Minimum ~100 bytes expected for a valid WebM header."
            )

        # ── Write WebM to temp file ────────────────────────────────────
        webm_fd, webm_path = tempfile.mkstemp(suffix=".webm")
        try:
            os.write(webm_fd, webm_bytes)
        finally:
            os.close(webm_fd)

        # ── Convert WebM → WAV via FFmpeg ──────────────────────────────
        try:
            t_start = time.time()
            wav_path = self._convert_to_wav(webm_path)
            conversion_time_ms = (time.time() - t_start) * 1000
        finally:
            # Always remove the temp WebM — we only keep the WAV
            if os.path.exists(webm_path):
                try:
                    os.remove(webm_path)
                except OSError:
                    pass

        # ── Read WAV duration ──────────────────────────────────────────
        duration_seconds = self._get_wav_duration(wav_path)

        logger.info(
            f"AudioProcessor: WebM → WAV complete — "
            f"duration: {duration_seconds:.2f}s, "
            f"conversion: {conversion_time_ms:.0f}ms"
        )

        return AudioPipelineContext(
            session_id=session_id,
            wav_path=wav_path,
            duration_seconds=duration_seconds,
            received_at=received_at,
            conversion_time_ms=conversion_time_ms,
        )

    @staticmethod
    def _convert_to_wav(webm_path: str) -> str:
        """Convert a WebM file to 16kHz mono PCM WAV using FFmpeg.

        This is the ONLY place in the entire codebase where FFmpeg
        is invoked for audio conversion.

        Args:
            webm_path: Path to the source WebM file.

        Returns:
            Path to the converted WAV file.

        Raises:
            RuntimeError: If FFmpeg is not installed or conversion fails.
        """
        wav_path = webm_path.replace(".webm", ".wav")

        cmd = [
            "ffmpeg",
            "-y",             # Overwrite output
            "-i", webm_path,  # Input
            "-ar", "16000",   # 16kHz sample rate (optimal for Whisper & accent models)
            "-ac", "1",       # Mono
            "-sample_fmt", "s16",  # 16-bit PCM
            "-f", "wav",      # Output format
            wav_path,
        ]

        logger.info("Converting WebM → WAV via FFmpeg...")
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                raise RuntimeError(
                    f"FFmpeg conversion failed (exit {result.returncode}): "
                    f"{result.stderr[:500]}"
                )
        except FileNotFoundError:
            raise RuntimeError(
                "FFmpeg not found. Install FFmpeg and ensure it is on PATH."
            )

        logger.info("WebM → WAV conversion complete.")
        return wav_path

    @staticmethod
    def _get_wav_duration(wav_path: str) -> float:
        """Read duration from a WAV file header.

        Args:
            wav_path: Path to a WAV file.

        Returns:
            Duration in seconds.
        """
        try:
            with wave.open(wav_path, "rb") as wf:
                frames = wf.getnframes()
                rate = wf.getframerate()
                return frames / float(rate) if rate > 0 else 0.0
        except Exception as e:
            logger.warning(f"Could not read WAV duration: {e}")
            return 0.0


# Module-level singleton
audio_processor = AudioProcessor()
