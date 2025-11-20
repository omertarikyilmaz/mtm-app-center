"""
Frontend API Service
FastAPI backend for frontend application
"""
import os
import json
import base64
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import sys
from pathlib import Path

# Add dataparser to path
try:
    # Try Docker volume mount path first
    dataparser_path = Path("/app/dataparser")
    if not dataparser_path.exists():
        # Try parent directory (local development)
        dataparser_path = Path(__file__).parent.parent / "dataparser"
    
    if dataparser_path.exists():
        sys.path.insert(0, str(dataparser_path))
        from iflas_pipeline import process_iflas_ilan, save_to_csv, save_batch_to_csv
    else:
        raise ImportError("dataparser directory not found")
except ImportError as e:
    print(f"Warning: Could not import iflas_pipeline: {e}")
    process_iflas_ilan = None
    save_to_csv = None
    save_batch_to_csv = None

app = FastAPI(title="MTM App Center Frontend", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# API URLs
DEEPSEEK_OCR_URL = os.getenv("DEEPSEEK_OCR_URL", "http://deepseek-ocr:8000")
QWEN_API_URL = os.getenv("QWEN_API_URL", "http://qwen2-5-1-5b:8001")


class ChatRequest(BaseModel):
    message: str
    system_prompt: Optional[str] = None
    max_new_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.6
    top_p: Optional[float] = 0.9


class ChatResponse(BaseModel):
    response: str
    status: str


@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main HTML page"""
    html_path = Path(__file__).parent / "templates" / "index.html"
    if html_path.exists():
        return html_path.read_text(encoding='utf-8')
    return """
    <html>
        <head><title>MTM App Center</title></head>
        <body><h1>MTM App Center Frontend</h1><p>Frontend files not found. Please check installation.</p></body>
    </html>
    """


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "deepseek_ocr": await check_service_health(DEEPSEEK_OCR_URL),
            "qwen": await check_service_health(QWEN_API_URL)
        }
    }


async def check_service_health(url: str) -> dict:
    """Check if a service is healthy"""
    try:
        response = requests.get(f"{url}/health", timeout=5)
        return {"status": "healthy" if response.status_code == 200 else "unhealthy"}
    except:
        return {"status": "unreachable"}


# ========== Qwen Chat Endpoints ==========

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with Qwen2.5 model
    """
    try:
        response = requests.post(
            f"{QWEN_API_URL}/chat/simple",
            data={
                "message": request.message,
                "system_prompt": request.system_prompt or "",
                "max_new_tokens": request.max_new_tokens,
                "temperature": request.temperature,
                "top_p": request.top_p
            },
            timeout=120
        )
        response.raise_for_status()
        result = response.json()
        return ChatResponse(
            response=result.get("response", ""),
            status=result.get("status", "success")
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Qwen API hatası: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat hatası: {str(e)}")


# ========== DeepSeekOCR Endpoints ==========

@app.post("/api/ocr")
async def ocr(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None)
):
    """
    Process OCR on an image using DeepSeekOCR
    """
    if not file and not image_base64:
        raise HTTPException(status_code=400, detail="No image provided")
    
    try:
        # Prepare request
        files = None
        data = {}
        
        if file:
            files = {"file": (file.filename, await file.read(), file.content_type)}
        elif image_base64:
            data["image_base64"] = image_base64
        
        if prompt:
            data["prompt"] = prompt
        else:
            data["prompt"] = "<image>\nFree OCR."
        
        # Call DeepSeekOCR API
        response = requests.post(
            f"{DEEPSEEK_OCR_URL}/ocr",
            files=files,
            data=data,
            timeout=300
        )
        response.raise_for_status()
        result = response.json()
        
        return {
            "text": result.get("text", ""),
            "status": result.get("status", "success")
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"DeepSeekOCR API hatası: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR hatası: {str(e)}")


# ========== İflas Pipeline Endpoints ==========

@app.post("/api/iflas/process")
async def process_iflas(
    file: UploadFile = File(...)
):
    """
    Process iflas/icra ilanı and return structured data
    """
    if process_iflas_ilan is None:
        raise HTTPException(status_code=503, detail="İflas pipeline modülü yüklenemedi")
    
    try:
        # Save uploaded file temporarily
        image_data = await file.read()
        
        # Process with pipeline
        result = process_iflas_ilan(image_data)
        
        return {
            "data": result,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İflas pipeline hatası: {str(e)}")


@app.post("/api/iflas/process-and-csv")
async def process_iflas_csv(
    file: UploadFile = File(...)
):
    """
    Process iflas/icra ilanı and return CSV file
    """
    if process_iflas_ilan is None or save_to_csv is None:
        raise HTTPException(status_code=503, detail="İflas pipeline modülü yüklenemedi")
    
    try:
        # Save uploaded file temporarily
        image_data = await file.read()
        
        # Process with pipeline
        result = process_iflas_ilan(image_data)
        
        # Save to temporary CSV
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            csv_path = f.name
            save_to_csv(result, csv_path, append=False)
        
        # Return CSV file
        return FileResponse(
            csv_path,
            media_type='text/csv',
            filename=f"{result.get('gorsel_dosya_adi', 'output')}.csv",
            headers={"Content-Disposition": f"attachment; filename={result.get('gorsel_dosya_adi', 'output')}.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"İflas pipeline hatası: {str(e)}")


@app.post("/api/iflas/batch-process")
async def batch_process_iflas(
    files: list[UploadFile] = File(...)
):
    """
    Process multiple iflas/icra ilanları and return CSV file
    """
    if process_iflas_ilan is None or save_batch_to_csv is None:
        raise HTTPException(status_code=503, detail="İflas pipeline modülü yüklenemedi")
    
    try:
        results = []
        errors = []
        
        for file in files:
            try:
                image_data = await file.read()
                result = process_iflas_ilan(image_data)
                results.append(result)
            except Exception as e:
                errors.append({
                    "filename": file.filename,
                    "error": str(e)
                })
        
        if not results:
            raise HTTPException(status_code=400, detail="Hiçbir görsel işlenemedi")
        
        # Save to temporary CSV
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8-sig') as f:
            csv_path = f.name
            save_batch_to_csv(results, csv_path)
        
        # Return CSV file
        return FileResponse(
            csv_path,
            media_type='text/csv',
            filename="batch_output.csv",
            headers={"Content-Disposition": "attachment; filename=batch_output.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch işleme hatası: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

