"""
Audio buffer for batching MediaRecorder chunks.

Collects small audio chunks and, once a time threshold is reached,
delegates to the STT service for transcription. Returns the transcript
text to the caller. Contains no WebSocket or session logic.
"""

import logging
from typing import Optional

from app.services.stt.transcriber import transcriber

logger = logging.getLogger(__name__)


class AudioBuffer:
    """Batches small audio chunks into segments suitable for Whisper.

    Collects chunks from the frontend (e.g. 300ms each) and once
    enough chunks accumulate (~3 seconds), invokes the STT service
    and returns the transcript.

    Args:
        threshold_seconds: Seconds of audio to accumulate before transcribing.
        chunk_duration_ms: Expected duration of each incoming chunk in milliseconds.
    """

    def __init__(
        self,
        threshold_seconds: float = 3.0,
        chunk_duration_ms: int = 300,
    ) -> None:
        self._buffer: bytearray = bytearray()
        self._chunk_count: int = 0
        self._target_chunks: int = int(
            (threshold_seconds * 1000) / chunk_duration_ms
        )

    def append(self, data: bytes) -> Optional[str]:
        """Append a chunk and transcribe if threshold is reached.

        Args:
            data: Raw audio bytes from MediaRecorder.

        Returns:
            Transcript text if threshold was reached, None otherwise.
        """
        self._buffer.extend(data)
        self._chunk_count += 1

        if self._chunk_count >= self._target_chunks:
            return self._flush_and_transcribe()
        return None

    def _flush_and_transcribe(self) -> str:
        """Flush the buffer, send to STT, and return transcript.

        Returns:
            Transcribed text from accumulated audio.
        """
        audio_bytes = bytes(self._buffer)
        buffer_size = len(audio_bytes)

        logger.info(
            f"AudioBuffer: threshold reached — "
            f"{buffer_size} bytes, {self._chunk_count} chunks. "
            f"Sending to STT."
        )

        # Reset buffer immediately
        self._buffer.clear()
        self._chunk_count = 0

        # Delegate transcription to the STT service
        return transcriber.transcribe_from_webm(audio_bytes)
