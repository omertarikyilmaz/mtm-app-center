from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from client import OCRClient
import io
import asyncio

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
    format: str

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/ocr", response_model=List[OCRResponse])
async def perform_ocr(
    files: List[UploadFile] = File(...),
    response_format: str = Form("json")  # "json" or "text"
):
    """
    Upload multiple image files to perform OCR.
    """
    results = []
    
    for file in files:
        if not file.content_type.startswith("image/"):
            # Skip non-image files or handle error
            continue

        try:
            contents = await file.read()
            
            # Process image using the OCR client
            # Note: For true parallelism with vLLM, we might need async client or thread pool
            # But for now, sequential processing is safer to avoid OOM
            result_text = ocr_client.process_image(contents, mime_type=file.content_type)
            
            results.append(OCRResponse(
                text=result_text, 
                filename=file.filename,
                format=response_format
            ))
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            results.append(OCRResponse(
                text=f"Error: {str(e)}", 
                filename=file.filename,
                format="error"
            ))
            
    return results

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
