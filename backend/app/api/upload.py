from fastapi import APIRouter

router = APIRouter()

@router.post("/upload")
async def upload_audio():
    # Placeholder for future implementation
    return {"message": "Upload endpoint placeholder"}
