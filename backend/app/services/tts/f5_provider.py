import os
import time
import logging
from typing import Dict
import io
import soundfile as sf
import torch

from app.services.tts.provider import TTSProvider
from app.config import settings
from app.services.stt.transcriber import transcriber

logger = logging.getLogger(__name__)

class F5TTSProvider(TTSProvider):
    def __init__(self):
        self.tts = None
        self._device = settings.tts_device
        self._ref_text_cache: Dict[str, str] = {}
        
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
            logger.info(f"Loading F5-TTS model on device: {device}...")
            
            # On Windows, TorchCodec requires FFmpeg shared DLLs. 
            # We attempt to find the winget installed shared ffmpeg and add it to DLL search path.
            if os.name == "nt":
                import glob
                local_app_data = os.environ.get("LOCALAPPDATA", "")
                if local_app_data:
                    search_pattern = os.path.join(
                        local_app_data, 
                        "Microsoft", "WinGet", "Packages", 
                        "Gyan.FFmpeg.Shared*", "*", "bin"
                    )
                    matches = glob.glob(search_pattern)
                    for match in matches:
                        if os.path.isdir(match):
                            try:
                                os.add_dll_directory(match)
                                logger.info(f"Added FFmpeg DLL directory: {match}")
                            except Exception as e:
                                logger.warning(f"Failed to add DLL directory {match}: {e}")

            # Lazy import to avoid slowing down startup if not used
            from f5_tts.api import F5TTS
            self.tts = F5TTS(model="F5TTS_Base", device=device)
            logger.info("F5-TTS model loaded successfully.")

    def _get_ref_text(self, speaker_wav: str) -> str:
        """Transcribe the reference audio if not already cached."""
        if speaker_wav in self._ref_text_cache:
            return self._ref_text_cache[speaker_wav]
            
        logger.info(f"Generating transcript for reference voice: {speaker_wav}")
        try:
            # F5-TTS requires an exact transcript of the reference audio for 0-shot cloning.
            # We use our existing STT service to generate it on the fly!
            ref_text = transcriber.transcribe(speaker_wav)
            logger.info(f"Reference text transcribed: {ref_text}")
        except Exception as e:
            logger.error(f"Failed to transcribe reference voice: {e}")
            ref_text = ""
            
        self._ref_text_cache[speaker_wav] = ref_text
        return ref_text

    def synthesize(self, text: str, speaker_wav: str, language: str = "en") -> tuple[bytes, int]:
        if not text or not text.strip():
            raise ValueError("Text for synthesis cannot be empty.")

        self._load_model()
        
        # Get reference text automatically
        ref_text = self._get_ref_text(speaker_wav)
        
        try:
            t_start = time.time()
            
            # Determine fewer steps for CPU to avoid hanging/long wait times
            device = self._detect_device()
            nfe_step = 16 if device == "cpu" else 32
            
            if device == "cpu":
                logger.info(f"Running F5-TTS on CPU. Using {nfe_step} steps for faster generation. This may still take a minute...")

            # Use F5-TTS inference
            # infer() returns (wav_array, sample_rate, spectrogram)
            wav, sr, spect = self.tts.infer(
                ref_file=speaker_wav,
                ref_text=ref_text,
                gen_text=text,
                nfe_step=nfe_step
            )
            
            # F5-TTS usually outputs a numpy array or torch tensor, convert to WAV bytes
            out_io = io.BytesIO()
            sf.write(out_io, wav, sr, format="wav")
            wav_bytes = out_io.getvalue()
            
            latency_ms = int((time.time() - t_start) * 1000)
            logger.info(f"F5-TTS synthesis completed in {latency_ms}ms")
            
            return wav_bytes, sr
            
        except Exception as e:
            logger.error(f"F5-TTS synthesis failed: {e}")
            raise
