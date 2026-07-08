# Aria Voice Agent - Project Documentation

This document maintains a chronological record of all changes, features added, implementations, and their corresponding file locations.

Use this website for audio clips:
https://accent.gmu.edu/browse_language.php?function=find&language=english

---

## Date: 2026-07-02

### 1. Project Planning & Architecture Review
- **Feature/Change:** Reviewed the provided architecture diagram, README, and requirements. Created a comprehensive 10-day implementation plan.
- **How it was added:** Created an `implementation_plan.md` artifact to break down the setup of the FastAPI backend, Coqui-TTS/MisoTTS, and Ollama integration into daily tasks.
- **File Location:** `implementation_plan.md` (and artifact tracker)

### 2. Initial Static Frontend Creation
- **Feature/Change:** Built a basic HTML/CSS/JS skeleton for the Aria voice agent interface.
- **How it was added:** Created static files to capture microphone input, send audio chunks (mocked), and update a basic transcript UI.
- **File Location:** `static/index.html`, `static/styles.css`, `static/app.js`

### 3. Next.js Migration & Miso Labs UI Redesign
- **Feature/Change:** Completely migrated the frontend from static HTML to a modern Next.js + React + Tailwind CSS architecture. The UI was redesigned to match the premium, minimalistic, light-themed aesthetic of Miso Labs.
- **How it was added:** Initialized a Next.js App Router project inside a new `frontend/` directory. Added Framer Motion and Lucide-React. Re-implemented the UI using a sleek, white canvas (`#FAFAFA`) with subtle noise textures and radial gradients.
- **File Location:** 
  - Entire `frontend/` directory
  - Global Styles: `frontend/src/app/globals.css`
  - Layout: `frontend/src/app/layout.tsx`

### 4. Component Refactoring & Advanced Orb Interaction
- **Feature/Change:** Refactored the monolithic UI into reusable components and implemented an advanced cursor-reactive orb.
- **How it was added:** 
  - Extracted UI parts into `Navbar.tsx`, `VoiceSelector.tsx` (dropdown), `AudioUpload.tsx` (drag & drop), and `TelemetryCard.tsx`.
  - Built `Orb.tsx` which uses a highly optimized `requestAnimationFrame` and linear interpolation (lerp) loop to track mouse movement. The component injects CSS variables (`--mouse-x`, `--mouse-y`) into `globals.css` to dynamically shift the orb's internal gradients and inner shadows, ensuring it remains a perfect circle (`border-radius: 50%`) while feeling like fluid glass.
  - Re-structured `page.tsx` to handle a responsive 3-column layout on desktop, stacking elegantly on mobile.
- **File Location:** 
  - Main Page: `frontend/src/app/page.tsx`
  - Components: `frontend/src/components/Orb.tsx`, `frontend/src/components/VoiceSelector.tsx`, `frontend/src/components/AudioUpload.tsx`, `frontend/src/components/TelemetryCard.tsx`, `frontend/src/components/Navbar.tsx`
  - Styles: `frontend/src/app/globals.css`

---

## Date: 2026-07-04 to 2026-07-05

### 5. Interactive Canvas 2D Particle Orb Integration
- **Feature/Change:** Completely replaced the previous CSS gradient orb with an advanced 2D Canvas-based particle orb. The new orb features hundreds of independently tracked points forming a 3D sphere that reacts dynamically to voice states (idle, listening, thinking, speaking) and microphone audio levels.
- **How it was added:**
  - Integrated custom 2D Canvas render loop logic directly into the `Orb.tsx` component, minimizing bundle size by stripping out heavy 3D rendering libraries like Three.js (`three`, `@react-three/fiber`, `@react-three/drei`).
  - Merged the Canvas code seamlessly with Framer Motion springs (`useSpring`, `useTransform`) to retain the beautiful 3D tilt and magnetic hover effect from previous iterations.
  - Implemented completely self-contained internal state management logic (e.g., `createStateMix`, `mixRgb`, `approach` functions) directly inside `Orb.tsx` to handle fluid transitions between various voice states.
  - Tweaked the canvas rendering properties (specifically increasing the `baseRadius` calculation multiplier from `0.62` to `0.75`) to make the orb's particle center slightly larger and more prominent.
- **File Location:** 
  - Component: `frontend/src/components/Orb.tsx`

### 6. Voice Settings and Audio Upload UI Improvements
- **Feature/Change:** Enhanced the readability and layering of the sidebar settings panels by modifying their frosted glass opacities and dropdown styles.
- **How it was added:**
  - Increased the base opacity of the Voice Settings and Accent Detection panels from `bg-white/40` to `bg-white/80`, and their borders from `border-white/60` to `border-white/80`, giving them a more solid, premium frosted glass appearance.
  - Redesigned the Voice Selector dropdown menu (`<ul>` listbox) to prevent it from blending into the Audio Upload section below it. Modified its class to use a solid white background (`bg-white`), a subtle dark border (`border-black/10`), and a pronounced drop shadow (`shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]`) to create clear visual separation.
- **File Location:**
  - Components: `frontend/src/components/VoiceSelector.tsx`, `frontend/src/components/AudioUpload.tsx`

### 7. Unadopted Rive Animation Exploration
- **Note:** Briefly attempted to clone and extract an animated Rive orb from an external repository (`yi-lai-design/rive-voice-agent`). This approach was ultimately not adopted in favor of the lightweight, highly customizable Canvas 2D particle implementation, which fit the existing project structure perfectly without relying on external `.riv` binaries. Temporary folders generated during this exploration (`rive-temp/`, `voiceorb-temp/`) are scheduled for cleanup.

---

## Date: 2026-07-06

### 8. Phase 1 Backend Implementation & WebSocket Integration
- **Feature/Change:** Established the foundational backend architecture and connected it to the frontend via real-time WebSockets to stream microphone audio.
- **How it was added:**
  - **Backend:** Created a new FastAPI application in the `backend/` directory. Added standard configurations, CORS middleware, and set up a modular folder structure for future services (`services/stt`, `services/llm`, `services/tts`, `services/accent`, `utils`, `schemas`, `models`). Implemented a WebSocket endpoint (`/ws/audio`) that accepts connections, continuously receives binary audio chunks, logs their size, and emits JSON acknowledgement events (`{"type": "ack", "status": "received"}`).
  - **Frontend:** Modified `frontend/src/app/page.tsx` to establish a WebSocket connection to the backend. Replaced the mocked `setTimeout` conversation flow with a real `MediaRecorder` instance that chunks microphone stream data every 300ms and sends it directly over the WebSocket. The frontend now dynamically updates its status and Orb animation state based on real events emitted by the backend state machine.
- **File Location:**
  - Backend Entry & Settings: `backend/run.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/requirements.txt`
  - Backend Routers: `backend/app/api/websocket.py`, `backend/app/api/upload.py`, `backend/app/api/feedback.py`
  - Frontend Modifications: `frontend/src/app/page.tsx`
