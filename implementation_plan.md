# Multi-Accent Voice Agent Implementation Plan

This document outlines a 10-day execution plan for building the Multi-Accent Voice Agent according to the provided architecture diagram and requirements. 

## 🎯 Architecture Summary

The architecture involves a real-time conversational voice loop with the following key layers:
1. **Frontend:** Browser-based UI with mic recording and streaming via WebSockets.
2. **Backend:** FastAPI server orchestrating the flow.
3. **Accent Detection:** SpeechBrain (ECAPA-TDNN) to extract audio embeddings and apply KNN classification to detect accents like Indian English, American English, etc.
4. **Speech-To-Text (STT):** Whisper (or Faster Whisper) to transcribe incoming audio.
5. **LLM:** Ollama 3.2b running locally to generate contextual replies.
6. **Text-To-Speech (TTS):** Coqui-TTS (or equivalent local TTS) to clone the assistant's voice using target accent voice samples.
7. **Storage & Feedback:** Supabase for uploading complete conversation audio and storing user feedback.

## ⚠️ User Review Required

> [!WARNING]
> **TTS Engine Discrepancy**
> The architecture diagram mentions **coqui-tts** for voice cloning, but the `requirements.txt` file mentions **MisoTTS**. Coqui TTS is currently unmaintained (archived). Please confirm if we should use Coqui-TTS, MisoTTS, or another modern local alternative (like XTTSv2 or Kokoro) for the voice generation step.

> [!IMPORTANT]
> **Ollama Setup**
> Have you already installed Ollama on your local machine? We will need `llama3.2` (or similar) pulled and running locally. 

> [!IMPORTANT]
> **Voice Samples Dataset**
> Do you already have the required voice samples (`aria_indian.wav`, `aria_american.wav`, etc.) for TTS voice cloning, and a dataset of embeddings to train the KNN classifier for the Accent Detection? If not, we will need to allocate time to generate/gather these datasets.

## 📅 10-Day Execution Timeline

### Day 1: Project Skeleton & UI Foundation (Today)
**Goal:** Setup project structure, dependencies, and the basic frontend interface.
- Initialize frontend HTML/JS/CSS structure.
- Build the "Try Aria" recording interface (mic permissions, record chunks).
- Implement basic visual elements (Sidebar for stats, Transcript scroll area).
- Ensure project dependencies (`pip install -r requirements.txt`) are fully installed and working.

### Day 2: WebSocket & FastAPI Backend
**Goal:** Establish real-time communication between the browser and the backend.
- Setup FastAPI server with Uvicorn.
- Create WebSocket endpoints to receive audio chunks (~500ms intervals) from the browser.
- Implement server-side logging to track chunk reception.
- Build temporary mock responses to ensure two-way WebSocket connectivity.

### Day 3: Speech-To-Text (Whisper STT)
**Goal:** Transcribe incoming audio streams accurately.
- Integrate `faster-whisper` into the WebSocket pipeline.
- Implement a buffer to aggregate audio chunks for accurate transcription.
- Stream transcription results back to the frontend to update the scrolling UI.

### Day 4: Accent Detection Engine (Part 1 - Embeddings)
**Goal:** Lay groundwork for real-time accent detection.
- Integrate `speechbrain` (ECAPA-TDNN).
- Create a script to process the pre-existing voice samples of different accents and extract their vector embeddings.
- Save the baseline accent embeddings into a local dataset format for the KNN classifier.

### Day 5: Accent Detection Engine (Part 2 - Classifier)
**Goal:** Complete the accent detection pipeline.
- Implement a KNN classifier that takes real-time user audio embeddings and compares them against the generated dataset.
- Calculate and return the final detected accent + confidence score (e.g., "Indian English, 94%").
- Stream these stats to the frontend sidebar.

### Day 6: LLM Integration (Ollama)
**Goal:** Add reasoning and conversational capabilities.
- Connect the FastAPI backend to the local Ollama instance running `llama3.2b`.
- Pass the transcription output to Ollama with appropriate system prompts.
- Stream generated text chunks back from Ollama to prepare for the TTS engine.

### Day 7: Text-to-Speech (Voice Cloning)
**Goal:** Generate accent-matched voice replies.
- Integrate the chosen TTS engine (Coqui-TTS/MisoTTS).
- Map the detected accent (or UI selected accent) to the appropriate Aria voice sample (`aria_indian.wav`, etc.).
- Convert Ollama's text replies into audio using voice cloning.

### Day 8: Audio Playback & Streaming Frontend
**Goal:** Complete the real-time loop by playing audio back to the user.
- Stream generated audio chunks from the TTS engine back through the WebSocket.
- Handle frontend progressive audio playback using Web Audio API or similar.
- Synchronize transcript UI updates with audio playback.

### Day 9: End Conversation Flow & Supabase
**Goal:** Handle session termination, audio merging, and cloud storage.
- Implement the "End conversation" button logic on the frontend.
- Merge the entire session's user and assistant audio into a single `.mp3` file on the backend.
- Connect to Supabase via API/SDK and upload the `.mp3` file to storage.

### Day 10: Feedback Page & Polish
**Goal:** Finalize the project, test edge cases, and capture model feedback.
- Build the `/feedback` page to capture user ratings.
- Save feedback data into the Supabase feedback table.
- Conduct End-to-End testing to measure latency, accuracy, and audio quality.
- Code cleanup and UI polish.

## 🧪 Verification Plan

### Automated / Unit Tests
- Test WebSocket connection stability.
- Validate STT transcriptions against known audio samples.
- Verify SpeechBrain embedding dimensions and KNN classification accuracy.

### Manual Verification
- Manually test the full loop: speak into the mic -> wait for audio response.
- Verify that speaking in different accents updates the sidebar confidence scores correctly.
- Ensure the conversation audio is successfully compiled and uploaded to Supabase upon completion.
