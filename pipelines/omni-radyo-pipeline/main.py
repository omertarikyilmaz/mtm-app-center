from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import io
import time
from pydub import AudioSegment
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MTM Omni-Radyo Pipeline", version="1.0.0")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_details = traceback.format_exc()
    logger.error(f"Global Error: {error_details}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"},
    )

@app.get("/")
async def root():
    return {"status": "running", "service": "omni-radyo-pipeline"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class AudioSegment(BaseModel):
    start: float
    end: float
    label: str  # HABER, REKLAM, MÜZIK, JINGLE, DİĞER

class RadioAnalysisResult(BaseModel):
    segments: List[AudioSegment]
    total_duration: float
    processing_time: float

# Lazy load model (GPU intensive)
_model = None

def get_model():
    """
    Lazy load OmniAudio model with GPU support
    """
    global _model
    if _model is None:
        logger.info("Loading OmniAudio-2.6B model on GPU...")
        try:
            from nexa.gguf import NexaAudioLMInference
            # Load with GPU support (CUDA)
            _model = NexaAudioLMInference("omniaudio:q4_K_M", device="cuda")
            logger.info("Model loaded successfully on GPU")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise HTTPException(500, f"Model loading failed: {str(e)}")
    return _model

def chunk_audio(audio_bytes: bytes, chunk_duration_ms: int = 30000) -> List[Dict]:
    """
    Split audio into chunks
    
    Args:
        audio_bytes: Audio file bytes
        chunk_duration_ms: Chunk duration in milliseconds (default 30s)
    
    Returns:
        List of dicts with start_time, end_time, audio_bytes
    """
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        total_duration_ms = len(audio)
        chunks = []
        
        logger.info(f"Audio duration: {total_duration_ms / 1000.0:.2f}s, splitting into {chunk_duration_ms / 1000}s chunks")
        
        for i in range(0, total_duration_ms, chunk_duration_ms):
            chunk = audio[i:i + chunk_duration_ms]
            
            # Export chunk to WAV bytes
            chunk_bytes_io = io.BytesIO()
            chunk.export(chunk_bytes_io, format="wav")
            
            chunks.append({
                "start_time": i / 1000.0,
                "end_time": min((i + chunk_duration_ms) / 1000.0, total_duration_ms / 1000.0),
                "audio_bytes": chunk_bytes_io.getvalue()
            })
        
        logger.info(f"Created {len(chunks)} chunks")
        return chunks
        
    except Exception as e:
        logger.error(f"Error chunking audio: {e}")
        raise HTTPException(400, f"Audio chunking failed: {str(e)}")

def classify_audio_chunk(audio_chunk_bytes: bytes, model) -> str:
    """
    Classify single audio chunk using OmniAudio
    
    Args:
        audio_chunk_bytes: Audio chunk as WAV bytes
        model: OmniAudio model instance
    
    Returns:
        Label string: HABER/REKLAM/MÜZIK/JINGLE/DİĞER
    """
    prompt = """Bu 30 saniyelik radyo yayını ses kaydını dinle.

Bu sesi aşağıdaki kategorilerden BİRİNE sınıflandır:
- HABER: Haber sunumu, duyurular, bilgilendirme içeriği
- REKLAM: Reklamlar, tanıtımlar, sponsor içerikleri
- MÜZIK: Şarkılar, enstrümantal müzik
- JINGLE: Radyo istasyon tanıtım sesleri, kısa jingle'lar
- DİĞER: Sohbet, röportaj, belirsiz içerikler

SADECE kategori ismini yaz (HABER, REKLAM, MÜZIK, JINGLE veya DİĞER), başka hiçbir şey yazma."""

    try:
        # Run inference with OmniAudio
        response = model.inference(
            audio=audio_chunk_bytes,
            prompt=prompt,
            temperature=0.1,  # Low temperature for consistent classification
            max_tokens=10
        )
        
        # Extract and validate label
        label = response.strip().upper()
        valid_labels = ["HABER", "REKLAM", "MÜZIK", "JINGLE", "DİĞER"]
        
        if label not in valid_labels:
            # Try to extract if response has extra text
            for valid in valid_labels:
                if valid in label:
                    label = valid
                    break
            else:
                logger.warning(f"Invalid label '{label}', defaulting to DİĞER")
                label = "DİĞER"
        
        return label
        
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return "OTHER"  # Fallback

def merge_segments(chunk_classifications: List[Dict]) -> List[Dict]:
    """
    Merge consecutive chunks with same label into segments
    
    Args:
        chunk_classifications: List of {start_time, end_time, label}
    
    Returns:
        Merged segments list
    """
    if not chunk_classifications:
        return []
    
    segments = []
    current_segment = {
        "start": chunk_classifications[0]["start_time"],
        "end": chunk_classifications[0]["end_time"],
        "label": chunk_classifications[0]["label"]
    }
    
    for chunk in chunk_classifications[1:]:
        if chunk["label"] == current_segment["label"]:
            # Extend current segment
            current_segment["end"] = chunk["end_time"]
        else:
            # Save current and start new segment
            segments.append(current_segment)
            current_segment = {
                "start": chunk["start_time"],
                "end": chunk["end_time"],
                "label": chunk["label"]
            }
    
    # Add last segment
    segments.append(current_segment)
    
    logger.info(f"Merged {len(chunk_classifications)} chunks into {len(segments)} segments")
    return segments

@app.get("/health")
async def health_check():
    return {"status": "healthy", "gpu_available": True}

@app.post("/api/v1/analyze-radio", response_model=RadioAnalysisResult)
async def analyze_radio(
    file: UploadFile = File(...),
    chunk_duration: int = Form(30)  # Default 30 seconds
):
    """
    Analyze radio audio file and classify segments.
    
    Args:
        file: Audio file (mp3, wav, m4a, etc.)
        chunk_duration: Chunk duration in seconds (default 30)
    
    Returns:
        RadioAnalysisResult with segments list
    """
    start_time = time.time()
    
    try:
        # Read audio file
        audio_bytes = await file.read()
        logger.info(f"Received audio file: {file.filename}, size: {len(audio_bytes)} bytes")
        
        # Step 1: Chunk audio
        chunks = chunk_audio(audio_bytes, chunk_duration_ms=chunk_duration * 1000)
        total_duration = chunks[-1]["end_time"] if chunks else 0.0
        
        # Step 2: Load model
        model = get_model()
        
        # Step 3: Classify each chunk
        chunk_results = []
        for idx, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {idx + 1}/{len(chunks)} ({chunk['start_time']:.1f}s - {chunk['end_time']:.1f}s)")
            
            label = classify_audio_chunk(chunk["audio_bytes"], model)
            
            chunk_results.append({
                "start_time": chunk["start_time"],
                "end_time": chunk["end_time"],
                "label": label
            })
            
            logger.info(f"Chunk {idx + 1} classified as: {label}")
        
        # Step 4: Merge consecutive segments
        merged_segments = merge_segments(chunk_results)
        
        processing_time = time.time() - start_time
        logger.info(f"Analysis complete in {processing_time:.2f}s")
        
        return RadioAnalysisResult(
            segments=[AudioSegment(**seg) for seg in merged_segments],
            total_duration=total_duration,
            processing_time=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=False)
