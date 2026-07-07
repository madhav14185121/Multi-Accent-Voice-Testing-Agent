from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from app.services.session.manager import session_manager
from app.services.audio.buffer import AudioBuffer

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/audio")
async def websocket_audio(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to audio websocket.")
    
    # Create a session and an audio buffer for this connection
    session_id = session_manager.create_session()
    audio_buffer = AudioBuffer()

    # Notify frontend that backend is connected
    await websocket.send_json({"event": "connected", "message": f"Backend connected. Session ID: {session_id}"})
    
    try:
        while True:
            # Receive binary audio chunks continuously
            data = await websocket.receive_bytes()
            logger.info(f"Received audio chunk, Size: {len(data)} bytes")
            
            # Add to audio buffer
            audio_buffer.append(data)
            
            # Immediately send acknowledgement
            await websocket.send_json({
                "event": "ack",
                "message": f"Chunk of size {len(data)} received"
            })
            
    except WebSocketDisconnect:
        logger.info("Client disconnected from audio websocket gracefully.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"event": "error", "message": str(e)})
        except:
            pass
    finally:
        # Clean up session
        session_manager.remove_session(session_id)
