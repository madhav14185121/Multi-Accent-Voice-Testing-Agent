# 🎙️ ARIA — Multi-Accent Voice Testing Agent

**A real-time, AI-driven voice agent testing platform for accent analysis and conversational AI.**

---

## 📖 Introduction
ARIA (Multi-Accent Voice Testing Agent) is an advanced, real-time conversational AI system designed to test and analyze voice interactions across various English accents. With a sleek, premium Next.js frontend and a highly modular FastAPI backend, ARIA provides an end-to-end pipeline from speech-to-text (STT) to large language model (LLM) generation and text-to-speech (TTS) synthesis, along with comprehensive machine learning-based accent detection capabilities.

## 🎯 Problem Statement & Impact
**The Problem:** Traditional voice agents often struggle with diverse accents, leading to misinterpretations and poor user experiences. Testing these agents requires robust tools that can evaluate accent recognition accuracy, measure latency, and provide clear telemetry.

**Impact & Use Cases:** ARIA provides a unified interface for testing voice models against different accents (American, British, Indian, Australian, Canadian). It enables developers and QA engineers to continuously evaluate STT accuracy, analyze LLM response relevance, and measure end-to-end latency.

## 🧭 Architecture
![ARIA System Architecture](./image.png)

**Architecture Flow:** The user interacts with the ARIA frontend via a Push-to-Talk interface or audio file upload. The frontend streams audio chunks over WebSockets to the FastAPI backend. The backend orchestrates a modular AI pipeline: Faster-Whisper transcribes the audio (STT), Ollama generates a response (LLM), and F5-TTS synthesizes the reply audio (TTS). For uploaded files, a PyTorch Wav2Vec2 model detects the user's accent and saves a detailed telemetry report in Supabase.

## 💻 Frontend (Technical Deep-Dive)
**Framework:** Next.js with React and Tailwind CSS.

### File-by-File Breakdown
- **`frontend/src/app/page.tsx`**: Main entry point and WebSocket orchestrator. Manages `MediaRecorder`, handles the Push-to-Talk (PTT) interaction, and coordinates the 3-column UI layout.
- **`frontend/src/components/Orb.tsx`**: Advanced 2D Canvas and Framer Motion particle orb that visualizes voice states (`idle`, `connecting`, `listening`, `thinking`, `speaking`, `error`).
- **`frontend/src/components/LiveAnalysisPanel.tsx`**: Renders real-time turn pipeline telemetry and latency stats.
- **`frontend/src/components/AudioUpload.tsx`**: Drag-and-drop component for uploading `.wav`, `.mp3`, and `.m4a` files for accent detection.

### Frontend ↔ Backend Communication
- **WebSockets:** `ws://<backend>/ws/audio` for real-time bidirectional Push-to-Talk streaming.
- **REST APIs:** `POST /api/upload` for accent detection, `GET /api/history` for report management.

## ⚙️ Backend (Technical Deep-Dive)
**Framework:** FastAPI with Uvicorn.

### End-to-End Pipeline
1. **Audio Ingestion**: Audio streamed via WebSockets or REST file upload. `AudioProcessor` normalizes the audio via FFmpeg.
2. **Accent Detection**: `AccentDetector` uses Wav2Vec2 to extract accent confidence scores.
3. **STT**: `WhisperTranscriber` (Faster-Whisper) converts normalized WAV into text.
4. **LLM**: `LLMClient` sends the transcript to Ollama (Llama 3) to generate a text reply.
5. **TTS**: `F5TTSProvider` synthesizes the text reply back into speech using the chosen target voice reference.
6. **Response**: Synthesized audio is Base64-encoded and sent back to the frontend over the WebSocket.

### Supabase Integration
- **Storage**: Audio files are uploaded to the `audio-uploads` bucket with unique UUID filenames via `supabase_client.py`.
- **Database**: Telemetry rows are inserted into the `accent_reports` table via `upload.py`.

## 🛠️ Customization Guide

| Customization | File(s) to Change | Notes |
|---|---|---|
| Swap LLM model (Ollama) | `backend/app/services/llm/client.py`, `backend/app/config.py` | Replace Ollama API call with OpenAI/Anthropic SDK. |
| Swap STT model (Whisper → other) | `backend/app/services/stt/transcriber.py` | Replace Faster-Whisper logic with Deepgram/Google STT API calls. |
| Swap TTS model (F5-TTS → other) | `backend/app/services/tts/f5_provider.py` | Replace F5-TTS inference with ElevenLabs or Coqui API. |
| Change target language/accent | `backend/app/services/stt/transcriber.py`, `backend/app/services/accent/detector.py` | Update STT language parameter and load a different Hugging Face accent model. |

## 🚀 Setup & Run Instructions
**Prerequisites:** Python 3.11+, Node.js 18+, FFmpeg installed and added to PATH, Ollama installed and running locally.

**Environment Variables:**
Create `backend/.env`:
```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_BUCKET=audio-uploads
OLLAMA_MODEL=llama3
```

**Commands to Run Backend:**
```bash
cd backend
python -m pip install -r requirements.txt
python run.py
```

**Commands to Run Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🧩 Tech Stack Summary

| Technology | Role / Purpose |
|---|---|
| **Next.js (React)** & **Tailwind CSS** | Frontend web framework and styling. |
| **HTML5 Canvas 2D** & **Framer Motion** | High-performance particle rendering engine for the voice Orb. |
| **FastAPI** | High-performance Python backend framework. |
| **Faster-Whisper** | Lightning-fast Speech-to-Text (STT). |
| **Ollama (Llama 3)** | Local LLM for conversational logic. |
| **F5-TTS** | Zero-shot Text-to-Speech synthesis. |
| **Hugging Face / PyTorch** | Wav2Vec2 audio classification for accent detection. |
| **FFmpeg** | Core audio manipulation and chunk normalization tool. |
| **Supabase** | Cloud Postgres database (telemetry) and S3-compatible storage. |
