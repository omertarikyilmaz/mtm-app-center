from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from client import HunyuanOCRClient
import os

app = FastAPI(title="MTM HunyuanOCR Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize HunyuanOCR Client
vllm_url = os.getenv("VLLM_URL", "http://hunyuan-ocr-vllm:8102/v1")
ocr_client = HunyuanOCRClient(base_url=vllm_url)


class OCRResponse(BaseModel):
    text: str
    filename: str
    prompt: str
    parameters: dict


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "hunyuan-ocr"}


@app.post("/api/v1/hunyuan-ocr", response_model=List[OCRResponse])
async def perform_hunyuan_ocr(
    files: List[UploadFile] = File(...),
    prompt: str = Form("检测并识别图片中的文字，将文本坐标格式化输出。"),
    temperature: float = Form(0.0),
    max_tokens: int = Form(16384),
    top_p: float = Form(1.0),
    top_k: int = Form(-1)
):
    """
    Upload multiple image files to perform HunyuanOCR with custom parameters.
    
    Args:
        files: List of image files
        prompt: Custom OCR prompt (default: Chinese text spotting)
        temperature: Sampling temperature (0-1, default: 0)
        max_tokens: Maximum tokens (512-16384, default: 16384)
        top_p: Nucleus sampling (0-1, default: 1.0)
        top_k: Top-k sampling (-1 for disabled, default: -1)
    
    Returns:
        List of OCR results with parameters used
    """
    results = []
    
    # Parameter validation
    temperature = max(0.0, min(1.0, temperature))
    max_tokens = max(512, min(16384, max_tokens))
    top_p = max(0.0, min(1.0, top_p))
    
    for file in files:
        if not file.content_type.startswith("image/"):
            # Skip non-image files
            continue

        try:
            contents = await file.read()
            
            # Process image using the OCR client with custom parameters
            result_text = ocr_client.process_image(
                contents, 
                mime_type=file.content_type,
                prompt=prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p,
                top_k=top_k
            )
            
            results.append(OCRResponse(
                text=result_text, 
                filename=file.filename,
                prompt=prompt,
                parameters={
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": top_p,
                    "top_k": top_k
                }
            ))
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            results.append(OCRResponse(
                text=f"Error: {str(e)}", 
                filename=file.filename,
                prompt=prompt,
                parameters={
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "top_p": top_p,
                    "top_k": top_k
                }
            ))
            
    return results


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
