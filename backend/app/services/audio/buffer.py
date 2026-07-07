import logging

logger = logging.getLogger(__name__)

class AudioBuffer:
    """
    Collects small audio chunks from the frontend (e.g. 300ms chunks) 
    and batches them into larger continuous segments (e.g. 3-5 seconds) 
    for better transcription quality with Whisper.
    """
    def __init__(self, threshold_seconds: float = 3.0, chunk_duration_ms: int = 300):
        self.buffer = bytearray()
        self.chunk_count = 0
        # Calculate how many chunks are needed to reach the threshold
        self.target_chunks = int((threshold_seconds * 1000) / chunk_duration_ms)
        
    def append(self, data: bytes) -> bool:
        """
        Appends data to the buffer. Returns True if the buffer reached the threshold and was processed.
        """
        self.buffer.extend(data)
        self.chunk_count += 1
        
        if self.chunk_count >= self.target_chunks:
            self.process_buffer()
            return True
        return False

    def process_buffer(self):
        """
        Simulates processing the audio buffer (e.g. sending to STT/Whisper).
        """
        logger.info(f"AudioBuffer: threshold reached. Processing {len(self.buffer)} bytes of audio data.")
        # Clear buffer after processing
        self.buffer.clear()
        self.chunk_count = 0
