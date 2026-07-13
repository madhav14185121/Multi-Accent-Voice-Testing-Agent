"""
Conversation accumulator — accumulates normalized speech for future accent detection.

Collects processed WAV segments from the AudioPipelineContext across a
session. Once approximately 10–15 seconds of actual speech have been
accumulated, exposes a combined normalized WAV for downstream consumers
(e.g. accent detection).

This service is independent of SessionManager — it owns only audio
accumulation, not metadata or conversation state.
"""

import io
import logging
import os
import tempfile
import wave
from typing import Optional

logger = logging.getLogger(__name__)

# Target speech duration before accent detection can run
_TARGET_SPEECH_SECONDS: float = 12.0  # ~10-15s sweet spot


class ConversationAccumulator:
    """Accumulates normalized WAV segments across a session.

    Created per-session. Accepts WAV file paths from AudioPipelineContext,
    reads and appends their PCM data into a running buffer. Once the
    accumulated duration reaches the threshold, signals readiness and
    exposes a combined WAV file.

    This service does NOT perform accent detection — it only prepares
    the audio. A future accent detection step will consume the
    accumulated WAV when ready.
    """

    def __init__(self, target_seconds: float = _TARGET_SPEECH_SECONDS) -> None:
        self._target_seconds = target_seconds
        self._pcm_frames: bytearray = bytearray()
        self._sample_rate: int = 16000
        self._sample_width: int = 2   # 16-bit PCM = 2 bytes
        self._channels: int = 1       # mono
        self._accumulated_seconds: float = 0.0
        self._ready: bool = False
        self._combined_wav_path: Optional[str] = None

    @property
    def accumulated_seconds(self) -> float:
        """Total seconds of speech accumulated so far."""
        return self._accumulated_seconds

    @property
    def is_ready(self) -> bool:
        """True when enough speech has been accumulated for accent detection."""
        return self._ready

    def append(self, wav_path: str) -> bool:
        """Append a normalized WAV segment to the accumulator.

        Reads PCM data from the WAV file and adds it to the running
        buffer. If the accumulated duration crosses the threshold,
        marks the accumulator as ready.

        Args:
            wav_path: Path to a 16kHz mono PCM WAV file (from AudioPipelineContext).

        Returns:
            True if the accumulator just became ready (crossed threshold),
            False otherwise.
        """
        if self._ready:
            # Already have enough speech — skip further accumulation
            return False

        try:
            with wave.open(wav_path, "rb") as wf:
                # Validate format matches our expected normalization
                if wf.getframerate() != self._sample_rate:
                    logger.warning(
                        f"Accumulator: unexpected sample rate {wf.getframerate()}, "
                        f"expected {self._sample_rate}. Skipping segment."
                    )
                    return False

                frames = wf.readframes(wf.getnframes())
                self._pcm_frames.extend(frames)

                segment_seconds = len(frames) / (
                    self._sample_rate * self._sample_width * self._channels
                )
                self._accumulated_seconds += segment_seconds

        except Exception as e:
            logger.warning(f"Accumulator: failed to read WAV segment: {e}")
            return False

        logger.info(
            f"Accumulator: {self._accumulated_seconds:.1f}s / "
            f"{self._target_seconds:.0f}s accumulated"
        )

        if self._accumulated_seconds >= self._target_seconds:
            self._ready = True
            logger.info(
                f"Accumulator: ready — {self._accumulated_seconds:.1f}s of speech collected"
            )
            return True

        return False

    def get_combined_wav_path(self) -> Optional[str]:
        """Write accumulated PCM data to a temporary WAV file and return its path.

        Returns the same path on subsequent calls (cached). The caller
        should call cleanup() when done.

        Returns:
            Path to combined WAV file, or None if no data accumulated.
        """
        if not self._pcm_frames:
            return None

        # Return cached path if already written
        if self._combined_wav_path and os.path.exists(self._combined_wav_path):
            return self._combined_wav_path

        fd, path = tempfile.mkstemp(suffix="_accumulated.wav")
        os.close(fd)

        try:
            with wave.open(path, "wb") as wf:
                wf.setnchannels(self._channels)
                wf.setsampwidth(self._sample_width)
                wf.setframerate(self._sample_rate)
                wf.writeframes(bytes(self._pcm_frames))
        except Exception as e:
            logger.error(f"Accumulator: failed to write combined WAV: {e}")
            if os.path.exists(path):
                os.remove(path)
            return None

        self._combined_wav_path = path
        logger.info(
            f"Accumulator: wrote combined WAV — "
            f"{self._accumulated_seconds:.1f}s, {len(self._pcm_frames)} bytes"
        )
        return path

    def get_combined_wav_bytes(self) -> Optional[bytes]:
        """Return accumulated audio as in-memory WAV bytes.

        Useful for passing directly to services that accept bytes
        (e.g. the existing AccentDetector.detect()).

        Returns:
            WAV file bytes, or None if no data accumulated.
        """
        if not self._pcm_frames:
            return None

        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wf:
            wf.setnchannels(self._channels)
            wf.setsampwidth(self._sample_width)
            wf.setframerate(self._sample_rate)
            wf.writeframes(bytes(self._pcm_frames))

        return buffer.getvalue()

    def cleanup(self) -> None:
        """Remove any temporary files created by the accumulator."""
        if self._combined_wav_path and os.path.exists(self._combined_wav_path):
            try:
                os.remove(self._combined_wav_path)
                logger.debug(f"Accumulator: cleaned up {self._combined_wav_path}")
            except OSError as e:
                logger.warning(f"Accumulator: cleanup failed: {e}")
            self._combined_wav_path = None

    def reset(self) -> None:
        """Reset the accumulator for a new detection cycle.

        Call this after accent detection has consumed the accumulated audio
        if you want to start collecting again (e.g. for re-detection).
        """
        self.cleanup()
        self._pcm_frames.clear()
        self._accumulated_seconds = 0.0
        self._ready = False
