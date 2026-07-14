"""STT (Speech-to-Text) service package.

Pure transcription service using Faster-Whisper. Expects pre-normalized
WAV audio from the AudioProcessor.
"""

from app.services.stt.transcriber import transcriber

__all__ = ["transcriber"]
