"""
TTS Engine Factory

This module exposes a generic `tts_service` instance that implements
the `TTSProvider` interface. This allows us to easily swap out the
underlying TTS model (e.g. Coqui TTS -> F5-TTS) without changing
the rest of the application codebase.
"""

import logging
from app.config import settings

logger = logging.getLogger(__name__)

def _create_tts_service():
    """Factory method to create the configured TTS provider."""
    # We can use settings or environment variables to switch providers in the future
    # Currently hardcoded to the modern F5-TTS provider
    logger.info("Initializing F5-TTS Provider...")
    from app.services.tts.f5_provider import F5TTSProvider
    return F5TTSProvider()

# A singleton service exported to the rest of the application
tts_service = _create_tts_service()
