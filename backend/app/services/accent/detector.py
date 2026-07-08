import os
import tempfile
import torch
import librosa
from transformers import pipeline

class AccentDetector:
    def __init__(self):
        # Load the Hugging Face model once at initialization (which happens at import time via singleton)
        self.classifier = pipeline("audio-classification", model="dima806/english_accents_classification")
        
        # Map raw labels to friendly names
        self.label_map = {
            "us": "American English",
            "american": "American English",
            "england": "British English",
            "british": "British English",
            "uk": "British English",
            "indian": "Indian English",
            "india": "Indian English",
            "australia": "Australian English",
            "australian": "Australian English",
            "canada": "Canadian English",
            "canadian": "Canadian English"
        }

    def detect(self, audio_bytes: bytes, filename: str) -> dict:
        # 1. Write bytes to a temp file
        suffix = os.path.splitext(filename)[1]
        if not suffix:
            suffix = ".wav"
            
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # 2. Load via librosa
            audio, sr = librosa.load(tmp_path, sr=16000, mono=True)
            
            # 3. Trim silence
            audio_trimmed, _ = librosa.effects.trim(audio, top_db=25)
            
            duration_seconds = len(audio_trimmed) / sr
            
            # 4. Reject clips shorter than 1 second
            if duration_seconds < 1.0:
                raise ValueError("Audio clip must be at least 1 second long after trimming silence.")

            # 5. Run inference with torch.no_grad()
            with torch.no_grad():
                results = self.classifier(audio_trimmed)
                
            # We want top 3
            top3_results = results[:3]
            top1 = top3_results[0]
            raw_label = top1['label'].lower()
            
            # Map raw label to friendly name
            friendly_accent = self.label_map.get(raw_label, raw_label.title() + " English")
            
            # Format top3
            top3 = [{"label": res["label"], "confidence": round(res["score"] * 100, 1)} for res in top3_results]
            
            return {
                "accent": friendly_accent,
                "raw_label": raw_label,
                "confidence": round(top1["score"] * 100, 1),
                "duration_seconds": round(duration_seconds, 1),
                "top3": top3
            }
            
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

# Export a module-level singleton
accent_detector = AccentDetector()
