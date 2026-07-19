import abc

class TTSProvider(abc.ABC):
    @abc.abstractmethod
    def synthesize(self, text: str, speaker_wav: str, language: str = "en") -> tuple[bytes, int]:
        """
        Synthesize speech from text.
        
        Args:
            text: The text to synthesize.
            speaker_wav: The path to the reference speaker audio.
            language: The language code (default: "en").
            
        Returns:
            A tuple of (wav_bytes, sample_rate).
        """
        pass
