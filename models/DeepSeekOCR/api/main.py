"""
DeepSeekOCR API Service
FastAPI service for OCR processing
"""
import os
import asyncio
import base64
import io
from typing import Optional, List
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image, ImageOps
import torch

# Set environment variables before importing vllm
if torch.version.cuda == '11.8':
    os.environ["TRITON_PTXAS_PATH"] = "/usr/local/cuda-11.8/bin/ptxas"

os.environ['VLLM_USE_V1'] = '0'
os.environ["CUDA_VISIBLE_DEVICES"] = os.getenv("CUDA_VISIBLE_DEVICES", "0")

from vllm import AsyncLLMEngine, SamplingParams
from vllm.engine.arg_utils import AsyncEngineArgs
from vllm.model_executor.models.registry import ModelRegistry

# Import DeepSeekOCR modules
import sys
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
from deepseek_ocr import DeepseekOCRForCausalLM
from process.ngram_norepeat import NoRepeatNGramLogitsProcessor
from process.image_process import DeepseekOCRProcessor
from config import MODEL_PATH, BASE_SIZE, IMAGE_SIZE, CROP_MODE

# Register the model
ModelRegistry.register_model("DeepseekOCRForCausalLM", DeepseekOCRForCausalLM)

app = FastAPI(title="DeepSeekOCR API", version="1.0.0")

# CORS middleware for cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global engine instance
engine: Optional[AsyncLLMEngine] = None
processor: Optional[DeepseekOCRProcessor] = None


class OCRRequest(BaseModel):
    prompt: Optional[str] = None
    image_base64: Optional[str] = None


class OCRResponse(BaseModel):
    text: str
    status: str = "success"


def load_image(image_data: bytes) -> Image.Image:
    """Load and process image from bytes"""
    try:
        image = Image.open(io.BytesIO(image_data))
        corrected_image = ImageOps.exif_transpose(image)
        return corrected_image.convert('RGB')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error loading image: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize the model engine on startup"""
    global engine, processor
    
    print("Initializing DeepSeekOCR engine...")
    
    engine_args = AsyncEngineArgs(
        model=MODEL_PATH,
        hf_overrides={"architectures": ["DeepseekOCRForCausalLM"]},
        block_size=256,
        max_model_len=8192,
        enforce_eager=False,
        trust_remote_code=True,
        tensor_parallel_size=1,
        gpu_memory_utilization=0.50,  # İki model birlikte çalışacağı için %50
    )
    
    engine = AsyncLLMEngine.from_engine_args(engine_args)
    processor = DeepseekOCRProcessor()
    
    print("DeepSeekOCR engine initialized successfully!")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "DeepSeekOCR API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "engine_ready": engine is not None}


@app.post("/ocr", response_model=OCRResponse)
async def process_ocr(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None)
):
    """
    Process OCR on an image
    
    Args:
        file: Image file upload
        image_base64: Base64 encoded image
        prompt: Optional custom prompt (default: '<image>\\nFree OCR.')
    
    Returns:
        OCR text result
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    # Get image data
    image_data = None
    if file:
        image_data = await file.read()
    elif image_base64:
        try:
            image_data = base64.b64decode(image_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 image: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="No image provided. Use 'file' or 'image_base64'")
    
    # Load and process image
    image = load_image(image_data)
    
    # Default prompt
    if prompt is None:
        prompt = '<image>\nFree OCR.'
    
    # Process image
    if '<image>' in prompt:
        image_features = processor.tokenize_with_images(
            images=[image], 
            bos=True, 
            eos=True, 
            cropping=CROP_MODE
        )
    else:
        image_features = None
    
    # Generate OCR result
    logits_processors = [
        NoRepeatNGramLogitsProcessor(
            ngram_size=30, 
            window_size=90, 
            whitelist_token_ids={128821, 128822}
        )
    ]
    
    sampling_params = SamplingParams(
        temperature=0.0,
        max_tokens=8192,
        logits_processors=logits_processors,
        skip_special_tokens=False,
    )
    
    request_id = f"request-{asyncio.get_event_loop().time()}"
    
    if image_features and '<image>' in prompt:
        request = {
            "prompt": prompt,
            "multi_modal_data": {"image": image_features}
        }
    elif prompt:
        request = {
            "prompt": prompt
        }
    else:
        raise HTTPException(status_code=400, detail="Prompt is required")
    
    # Generate output
    final_output = ""
    async for request_output in engine.generate(request, sampling_params, request_id):
        if request_output.outputs:
            final_output = request_output.outputs[0].text
    
    return OCRResponse(text=final_output, status="success")


@app.post("/ocr/batch")
async def process_ocr_batch(
    files: List[UploadFile] = File(...),
    prompt: Optional[str] = Form(None)
):
    """
    Process OCR on multiple images
    
    Args:
        files: List of image files
        prompt: Optional custom prompt
    
    Returns:
        List of OCR results
    """
    if engine is None:
        raise HTTPException(status_code=503, detail="Engine not initialized")
    
    if prompt is None:
        prompt = '<image>\nFree OCR.'
    
    results = []
    
    for file in files:
        try:
            image_data = await file.read()
            image = load_image(image_data)
            
            if '<image>' in prompt:
                image_features = processor.tokenize_with_images(
                    images=[image],
                    bos=True,
                    eos=True,
                    cropping=CROP_MODE
                )
            else:
                image_features = None
            
            logits_processors = [
                NoRepeatNGramLogitsProcessor(
                    ngram_size=30,
                    window_size=90,
                    whitelist_token_ids={128821, 128822}
                )
            ]
            
            sampling_params = SamplingParams(
                temperature=0.0,
                max_tokens=8192,
                logits_processors=logits_processors,
                skip_special_tokens=False,
            )
            
            request_id = f"request-{asyncio.get_event_loop().time()}-{file.filename}"
            
            if image_features and '<image>' in prompt:
                request = {
                    "prompt": prompt,
                    "multi_modal_data": {"image": image_features}
                }
            else:
                request = {"prompt": prompt}
            
            final_output = ""
            async for request_output in engine.generate(request, sampling_params, request_id):
                if request_output.outputs:
                    final_output = request_output.outputs[0].text
            
            results.append({
                "filename": file.filename,
                "text": final_output,
                "status": "success"
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "text": "",
                "status": "error",
                "error": str(e)
            })
    
    return {"results": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

