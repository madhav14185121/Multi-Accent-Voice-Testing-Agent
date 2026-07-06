from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/audio")
async def websocket_audio(websocket: WebSocket):
    await websocket.accept()
    logger.info("Client connected to audio websocket.")
    
    # Notify frontend that backend is ready and listening
    await websocket.send_json({"type": "state", "status": "listening", "message": "Backend connected and listening"})
    
    try:
        while True:
            # Receive binary audio chunks continuously
            data = await websocket.receive_bytes()
            logger.info(f"Received audio chunk, Size: {len(data)} bytes")
            
            # Immediately send acknowledgement
            await websocket.send_json({
                "type": "ack", 
                "status": "received",
                "message": f"Chunk of size {len(data)} received"
            })
            
    except WebSocketDisconnect:
        logger.info("Client disconnected from audio websocket gracefully.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"type": "state", "status": "error", "message": str(e)})
        except:
            pass
