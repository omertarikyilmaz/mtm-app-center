from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from client import OCRClient
import io

app = FastAPI(title="MTM OCR Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

# Initialize OCR Client
# Note: Ensure vLLM is running on port 8000
vllm_url = os.getenv("VLLM_URL", "http://localhost:8000/v1")
ocr_client = OCRClient(base_url=vllm_url)

class OCRResponse(BaseModel):
    text: str
    filename: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/ocr", response_model=OCRResponse)
async def perform_ocr(file: UploadFile = File(...)):
    """
    Upload an image file to perform OCR.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        
        # Process image using the OCR client
        result_text = ocr_client.process_image(contents, mime_type=file.content_type)
        
        return OCRResponse(text=result_text, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
