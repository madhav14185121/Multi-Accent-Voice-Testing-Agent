"""
WebSocket endpoint for real-time audio streaming and transcription.

Receives audio blobs from the frontend MediaRecorder, passes them through
the AudioProcessor to get a normalized AudioPipelineContext, transcribes
using Faster-Whisper, and orchestrates accumulation for future processing.
"""

import logging
import time
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.session.manager import session_manager
from app.services.stt.transcriber import transcriber
from app.services.audio import audio_processor, ConversationAccumulator

router = APIRouter()
logger = logging.getLogger(__name__)


def _print_transcript_block(session_id: str, text: str, latency_ms: float) -> None:
    """Print a formatted transcript block to the backend console.

    Args:
        session_id: The current session identifier.
        text: The transcribed text.
        latency_ms: Transcription latency in milliseconds.
    """
    print(
        f"\n{'─' * 40}\n"
        f"Session: {session_id[:8]}\n"
        f"Speaker: USER\n"
        f"Transcript:\n{text}\n\n"
        f"Latency: {latency_ms:.0f} ms\n"
        f"{'─' * 40}\n"
    )


@router.websocket("/audio")
async def websocket_audio(websocket: WebSocket) -> None:
    """Handle real-time audio streaming over WebSocket.

    Pipeline:
        Frontend (complete WebM blob) → WebSocket
        → AudioProcessor (WAV) → AudioPipelineContext
        → STT → transcript
        → ConversationAccumulator
        → transcript event
        → context.cleanup()
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
            # Receive complete WebM blob from frontend
            data = await websocket.receive_bytes()
            logger.info(f"Received complete audio blob, Size: {len(data)} bytes")

            context = None
            try:
                # 1. Process audio to normalized WAV
                context = audio_processor.process(data, session_id)

                # 2. Transcribe
                t_start = time.time()
                transcript = transcriber.transcribe(context.wav_path)
                context.transcription_time_ms = (time.time() - t_start) * 1000
                context.transcript = transcript

                # 3. Accumulate speech for future processing
                if transcript:
                    became_ready = accumulator.append(context.wav_path)
                    if became_ready:
                        logger.info("Accumulator reached target duration. Ready for future accent detection.")

                    timestamp = context.received_at

                    # Store in session
                    session_manager.add_transcript(
                        session_id, "user", transcript, timestamp
                    )

                    # Print to backend console
                    _print_transcript_block(session_id, transcript, context.transcription_time_ms)

                    # Emit transcript event to frontend
                    await websocket.send_json({
                        "event": "transcript",
                        "speaker": "user",
                        "text": transcript,
                        "timestamp": timestamp,
                    })
                else:
                    logger.info("Transcription returned empty text (silence or noise).")

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
