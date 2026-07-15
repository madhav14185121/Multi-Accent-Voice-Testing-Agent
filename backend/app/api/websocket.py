"""
WebSocket endpoint for real-time audio streaming and transcription.

Receives audio blobs from the frontend MediaRecorder, passes them through
the AudioProcessor to get a normalized AudioPipelineContext, transcribes
using Faster-Whisper, and orchestrates accumulation for future processing.
"""

import logging
import time
import json
import asyncio
import base64
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.session.manager import session_manager
from app.services.stt.transcriber import transcriber
from app.services.audio import audio_processor, ConversationAccumulator
from app.services.llm import llm_client, build_system_prompt
from app.services.accent.detector import accent_detector
from app.services.tts import xtts_service, resolve_voice_path
from app.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


async def run_accent_detection(audio_bytes: bytes, websocket: WebSocket, session_id: str) -> None:
    """Run accent detection in a background thread and emit telemetry event."""
    try:
        # Run detection in executor to avoid blocking async loop
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, accent_detector.detect, audio_bytes, "accumulated.wav")
        logger.info(f"Background accent detection completed: {result['accent']} ({result['confidence']}%)")
        
        # Send telemetry to frontend
        await websocket.send_json({
            "event": "telemetry",
            "accent": result["accent"],
            "confidence": result["confidence"],
            "duration": result["duration_seconds"]
        })
        
        # Update session with new accent and system prompt
        session_manager.set_accent(session_id, result["accent"])
        session_manager.add_message(session_id, "system", build_system_prompt(result["accent"]))
        
    except Exception as e:
        logger.error(f"Background accent detection failed: {e}", exc_info=True)


@router.websocket("/audio")
async def websocket_audio(websocket: WebSocket) -> None:
    """Handle real-time audio streaming over WebSocket for Push-to-Talk.

    Pipeline:
        Frontend (text event) -> Backend (emits listening)
        Frontend (complete WebM blob) -> Backend (emits thinking)
        -> AudioProcessor (WAV) -> AudioPipelineContext
        -> STT -> transcript -> emits transcript
        -> ConversationAccumulator (async accent detection if ready)
        -> LLM -> emits assistant_message
        -> emits idle
        -> context.cleanup()
    """
    await websocket.accept()
    logger.info("Client connected to audio websocket.")

    # Create a session for this connection
    session_id = session_manager.create_session()
    
    # Initialize the speech accumulator for this connection
    accumulator = ConversationAccumulator()

    # Notify frontend that backend is connected
    await websocket.send_json({
        "event": "connected",
        "message": f"Backend connected. Session ID: {session_id}",
    })

    try:
        while True:
            # Receive raw ASGI message to multiplex text and bytes safely
            message = await websocket.receive()
            
            if message["type"] == "websocket.disconnect":
                raise WebSocketDisconnect()

            text_data = message.get("text")
            if text_data:
                try:
                    data = json.loads(text_data)
                    if data.get("action") == "start_listening":
                        logger.info("Client started listening.")
                        voice = data.get("voice")
                        if voice:
                            session_manager.set_voice(session_id, voice)
                        await websocket.send_json({"event": "listening"})
                    elif data.get("action") == "playback_done":
                        await websocket.send_json({"event": "idle"})
                except json.JSONDecodeError:
                    pass
                continue
                
            bytes_data = message.get("bytes")
            if bytes_data:
                data = bytes_data
                logger.info(f"Received complete audio blob, Size: {len(data)} bytes")
                
                # Acknowledge receipt immediately so UI can update to 'Thinking...'
                await websocket.send_json({"event": "thinking"})
                # Yield control to the event loop so the ASGI server can flush the message to the client
                # before we block the thread with synchronous CPU-bound STT/LLM work
                await asyncio.sleep(0.05)

                context = None
                try:
                    # 1. Process audio to normalized WAV
                    context = audio_processor.process(data, session_id)

                    # 2. Transcribe using thread pool to avoid blocking event loop
                    t_start = time.time()
                    transcript = await asyncio.to_thread(transcriber.transcribe, context.wav_path)
                    context.transcription_time_ms = (time.time() - t_start) * 1000
                    context.transcript = transcript

                    # 3. Accumulate speech for future processing
                    if transcript:
                        became_ready = accumulator.append(context.wav_path)
                        if became_ready:
                            logger.info("Accumulator reached target duration. Launching background accent detection.")
                            # Launch detection without blocking
                            audio_bytes_accum = accumulator.get_combined_wav_bytes()
                            if audio_bytes_accum:
                                asyncio.create_task(run_accent_detection(audio_bytes_accum, websocket, session_id))
                                # Reset accumulator to collect next batch
                                accumulator.reset()

                        timestamp = context.received_at

                        # Store in session
                        session_manager.add_transcript(
                            session_id, "user", transcript, timestamp
                        )

                        # Emit transcript event to frontend
                        await websocket.send_json({
                            "event": "transcript",
                            "speaker": "user",
                            "text": transcript,
                            "timestamp": timestamp,
                        })
                        
                        # 4. LLM Generation
                        session = session_manager.get_session(session_id)
                        # Initialize system prompt if this is the first message
                        if not session.get("messages"):
                            session_manager.add_message(session_id, "system", build_system_prompt())
                        
                        # Add user message to LLM history
                        session_manager.add_message(session_id, "user", transcript)
                        
                        # Call LLM client (streams=False for now) using thread pool
                        t_llm_start = time.time()
                        reply = await asyncio.to_thread(
                            llm_client.chat, 
                            messages=session["messages"], 
                            stream=False
                        )
                        context.llm_time_ms = (time.time() - t_llm_start) * 1000
                        
                        logger.info(f"LLM reply generated in {context.llm_time_ms:.0f}ms")
                        
                        # Add assistant reply to LLM history
                        session_manager.add_message(session_id, "assistant", reply)
                        
                        # Emit assistant message event to frontend
                        await websocket.send_json({
                            "event": "assistant_message",
                            "role": "assistant",
                            "text": reply,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        })
                        
                        # TTS Synthesis
                        try:
                            # Use stored voice and accent
                            session = session_manager.get_session(session_id)
                            voice = session.get("voice")
                            accent = session.get("accent")
                            
                            # Resolve reference wav path
                            path = resolve_voice_path(voice=voice, accent=accent, default=settings.tts_default_voice)
                            
                            # Synthesize
                            wav_bytes, sample_rate = await asyncio.to_thread(
                                xtts_service.synthesize, reply, path, settings.tts_language
                            )
                            duration_ms = int(len(wav_bytes) / (sample_rate * 2) * 1000) # approximate
                            
                            await websocket.send_json({"event": "speaking"})
                            await websocket.send_json({
                                "event": "aria_speech",
                                "audio_base64": base64.b64encode(wav_bytes).decode("utf-8"),
                                "mime_type": "audio/wav",
                                "sample_rate": sample_rate,
                                "duration_ms": duration_ms,
                                "voice_used": path
                            })
                        except Exception as e:
                            logger.error(f"TTS synthesis failed: {e}")
                            await websocket.send_json({"event": "idle"})
                        
                    else:
                        logger.info("Transcription returned empty text (silence or noise).")
                        await websocket.send_json({"event": "idle"})

                except WebSocketDisconnect:
                    # Re-raise so the outer block handles the graceful disconnect
                    raise
                except Exception as processing_error:
                    logger.error(
                        f"Processing error: {processing_error}",
                        exc_info=True,
                    )
                    await websocket.send_json({
                        "event": "error",
                        "message": f"Processing failed: {str(processing_error)}",
                    })
                    await websocket.send_json({"event": "idle"})
                finally:
                    # The orchestrator owns the context lifecycle, so it cleans up here
                    if context:
                        context.cleanup()

    except WebSocketDisconnect:
        logger.info("Client disconnected from audio websocket gracefully.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"event": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        # Clean up session and accumulator
        session_manager.remove_session(session_id)
        accumulator.cleanup()
