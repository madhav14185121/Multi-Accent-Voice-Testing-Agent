"""
Audio pipeline context — the data object flowing through ARIA's audio pipeline.

A lightweight dataclass that represents a single processed audio segment.
All services receive and enrich this context rather than passing raw
file paths or bytes, keeping interfaces stable as ARIA evolves.
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AudioPipelineContext:
    """Represents a single processed audio segment flowing through the pipeline.

    Created by AudioProcessor after WebM → WAV conversion. Passed between
    services (STT, accent detection, analytics) so each can read what it
    needs and write what it produces.

    Adding a new AI service is as simple as adding a field here —
    no method signatures change anywhere.
    """

    # ── Set by AudioProcessor ──────────────────────────────────────────
    session_id: str
    wav_path: str                               # Normalized 16kHz mono PCM WAV
    duration_seconds: float = 0.0               # Audio duration
    received_at: str = ""                       # ISO-8601 timestamp
    conversion_time_ms: float = 0.0             # FFmpeg latency

    # ── Set by STT ─────────────────────────────────────────────────────
    transcript: Optional[str] = None
    transcription_time_ms: Optional[float] = None

    # ── Set by LLM ─────────────────────────────────────────────────────
    llm_time_ms: Optional[float] = None

    # ── Set by future Accent Detection ─────────────────────────────────
    accent: Optional[str] = None
    accent_confidence: Optional[float] = None

    # ── Lifecycle ──────────────────────────────────────────────────────
    _cleaned_up: bool = field(default=False, repr=False)

    def cleanup(self) -> None:
        """Remove temporary files associated with this context.

        Must be called by whoever owns the context lifecycle — typically
        the WebSocket orchestrator — after ALL downstream services have
        finished processing.
        """
        if self._cleaned_up:
            return
        self._cleaned_up = True

        for path in (self.wav_path,):
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                    logger.debug(f"Cleaned up temp file: {path}")
                except OSError as e:
                    logger.warning(f"Failed to remove temp file {path}: {e}")
