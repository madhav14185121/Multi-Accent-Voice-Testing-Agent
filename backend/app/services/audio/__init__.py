"""
Audio services package for ARIA.

Provides the core audio preprocessing pipeline:
- AudioPipelineContext: data object flowing through the pipeline
- AudioProcessor: sole owner of WebM → WAV conversion
- ConversationAccumulator: accumulates speech for future accent detection
"""

from app.services.audio.context import AudioPipelineContext
from app.services.audio.processor import audio_processor
from app.services.audio.accumulator import ConversationAccumulator

__all__ = [
    "AudioPipelineContext",
    "audio_processor",
    "ConversationAccumulator",
]
