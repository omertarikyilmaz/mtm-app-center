from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import openai
import os
import json
import tempfile
import asyncio
from pathlib import Path
import shutil

# Audio processing imports
from inaSpeechSegmenter import Segmenter
from pydub import AudioSegment

app = FastAPI(title="MTM Radyo News Pipeline", version="1.0.0")

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
TEMP_AUDIO_DIR = Path("/tmp/audio")
TEMP_AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# Models
class RadioSegment(BaseModel):
    """Audio segment information"""
    start_time: float  # seconds
    end_time: float  # seconds
    duration: float  # seconds
    segment_type: str  # 'speech', 'music', 'noise'
    gender: Optional[str] = None  # 'male', 'female' (not used in our case)

class NewsItem(BaseModel):
    """Structured news item"""
    segment_index: int
    start_time: float
    end_time: float
    duration: float
    baslik: Optional[str] = None
    ozet: Optional[str] = None
    tam_metin: str
    tarih: Optional[str] = None
    kisiler: Optional[List[str]] = None
    konular: Optional[List[str]] = None
    is_news: bool = True

class RadioAnalysisResult(BaseModel):
    """Complete analysis result"""
    total_duration: float  # seconds
    total_segments: int
    speech_segments: int
    music_segments: int
    noise_segments: int
    news_count: int
    segments: List[RadioSegment]
    news_items: List[NewsItem]

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_details = traceback.format_exc()
    print(f"Global Error: {error_details}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Global Server Error: {str(exc)}"},
    )

@app.get("/")
async def root():
    return {"status": "running", "service": "openai-radyo-pipeline"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Functions

def convert_to_wav(input_path: Path, output_path: Path) -> bool:
    """Convert any audio format to WAV using pydub"""
    try:
        print(f"[DEBUG] Converting {input_path} to WAV...")
        audio = AudioSegment.from_file(str(input_path))
        audio.export(str(output_path), format='wav')
        print(f"[DEBUG] Conversion successful: {output_path}")
        return True
    except Exception as e:
        print(f"[ERROR] Audio conversion failed: {e}")
        return False

def segment_audio(audio_path: Path) -> List[RadioSegment]:
    """
    Segment audio into speech, music, and noise using inaSpeechSegmenter
    
    Returns:
        List of RadioSegment objects
    """
    try:
        print(f"[DEBUG] Initializing segmenter...")
        # Initialize segmenter with 'smn' (speech/music/noise) engine
        # Skip gender detection for performance
        seg = Segmenter(vad_engine='smn', detect_gender=False)
        
        print(f"[DEBUG] Segmenting audio: {audio_path}")
        # Segmentation returns: [(label, start, end), ...]
        # label can be: 'speech', 'music', 'noise'
        segmentation = seg(str(audio_path))
        
        segments = []
        for label, start, end in segmentation:
            duration = end - start
            segments.append(RadioSegment(
                start_time=start,
                end_time=end,
                duration=duration,
                segment_type=label,
                gender=None
            ))
        
        print(f"[DEBUG] Segmentation complete: {len(segments)} segments found")
        return segments
        
    except Exception as e:
        print(f"[ERROR] Segmentation failed: {e}")
        raise

def merge_speech_segments(segments: List[RadioSegment], max_gap_seconds: float = 5.0) -> List[RadioSegment]:
    """
    Merge close speech segments to form news blocks
    
    Args:
        segments: List of all segments
        max_gap_seconds: Maximum gap between speech segments to merge (default: 5s)
    
    Returns:
        List of merged speech segments
    """
    speech_segments = [s for s in segments if s.segment_type == 'speech']
    
    if not speech_segments:
        return []
    
    # Sort by start time
    speech_segments.sort(key=lambda x: x.start_time)
    
    merged = []
    current = speech_segments[0]
    
    for next_seg in speech_segments[1:]:
        gap = next_seg.start_time - current.end_time
        
        if gap <= max_gap_seconds:
            # Merge segments
            current = RadioSegment(
                start_time=current.start_time,
                end_time=next_seg.end_time,
                duration=next_seg.end_time - current.start_time,
                segment_type='speech',
                gender=None
            )
        else:
            # Save current and start new
            merged.append(current)
            current = next_seg
    
    # Add last segment
    merged.append(current)
    
    # Filter out very short segments (< 15 seconds - likely jingles/transitions)
    merged = [s for s in merged if s.duration >= 15.0]
    
    print(f"[DEBUG] Merged {len(speech_segments)} speech segments into {len(merged)} blocks")
    return merged

def extract_audio_segment(input_path: Path, output_path: Path, start_sec: float, end_sec: float) -> bool:
    """Extract a segment from audio file"""
    try:
        audio = AudioSegment.from_wav(str(input_path))
        segment = audio[start_sec * 1000:end_sec * 1000]  # pydub uses milliseconds
        segment.export(str(output_path), format='wav')
        return True
    except Exception as e:
        print(f"[ERROR] Failed to extract segment: {e}")
        return False

async def transcribe_segment(segment_path: Path, api_key: str) -> str:
    """
    Transcribe audio segment using OpenAI Whisper API
    
    Args:
        segment_path: Path to WAV segment
        api_key: OpenAI API key
    
    Returns:
        Transcribed text
    """
    try:
        print(f"[DEBUG] Transcribing segment: {segment_path}")
        client = openai.OpenAI(api_key=api_key)
        
        with open(segment_path, 'rb') as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="tr",  # Turkish
                response_format="text"
            )
        
        print(f"[DEBUG] Transcription successful ({len(transcript)} chars)")
        return transcript
        
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}")
        raise

def create_news_extraction_prompt(transcript: str) -> str:
    """Create prompt for GPT to classify and extract news"""
    return f"""Sen radyo haber içeriklerini analiz eden bir yapay zekasın.

Aşağıdaki radyo transkripti verilmiştir. Bu metnin bir HABER içeriği mi yoksa REKLAM/MÜZİK/SÖYLEŞI/DİĞER mi olduğunu tespit et.

**HABER TESPİTİ KURALLARI:**
- Güncel olaylar, politika, ekonomi, spor, hava durumu, trafik gibi bilgilendirici içerikler HABERDIR
- Ürün tanıtımı, reklam sloganları, satış ilanları REKLAM'dır (is_news: false)
- Müzik sözleri, şarkı tanıtımı MÜZİK'tir (is_news: false)
- Genel sohbet, röportaj, program tanıtımı SÖYLEŞI'dir (is_news: false)

**EĞER HABER İSE:**
- **baslik**: Haberin kısa başlığı (5-10 kelime)
- **ozet**: Haberin özeti (1-2 cümle)
- **tam_metin**: Transkript metni aynen
- **tarih**: Metinde geçen tarih bilgisi varsa (format: GG.AA.YYYY veya serbest)
- **kisiler**: Metinde geçen önemli kişi/kurum isimleri (liste)
- **konular**: Ana konular/etiketler (örn: ["politika", "ekonomi"])
- **is_news**: true

**EĞER HABER DEĞİLSE:**
- **tam_metin**: Transkript metni aynen
- **is_news**: false
- Diğer alanlar null

**TRANSKRİPT:**
{transcript}

**JSON ŞEMASI:**
{{
  "baslik": "string veya null",
  "ozet": "string veya null",
  "tam_metin": "string",
  "tarih": "string veya null",
  "kisiler": ["string"] veya null,
  "konular": ["string"] veya null,
  "is_news": boolean
}}
"""

async def classify_and_extract_news(transcript: str, segment_index: int, start_time: float, end_time: float, api_key: str) -> Optional[NewsItem]:
    """
    Classify transcript and extract structured news data using GPT
    
    Returns:
        NewsItem if it's news, None otherwise
    """
    try:
        print(f"[DEBUG] Classifying segment {segment_index}...")
        client = openai.OpenAI(api_key=api_key)
        
        prompt = create_news_extraction_prompt(transcript)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen radyo haber analiz asistanısın. Sadece geçerli JSON döndür."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=1500,
            response_format={"type": "json_object"}
        )
        
        extracted_data = json.loads(response.choices[0].message.content)
        
        # Create NewsItem
        news_item = NewsItem(
            segment_index=segment_index,
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            **extracted_data
        )
        
        if news_item.is_news:
            print(f"[DEBUG] ✓ News detected: {news_item.baslik}")
            return news_item
        else:
            print(f"[DEBUG] ✗ Not news (reklam/müzik/diğer)")
            return None
        
    except Exception as e:
        print(f"[ERROR] Classification failed: {e}")
        # Return the transcript as-is on error
        return NewsItem(
            segment_index=segment_index,
            start_time=start_time,
            end_time=end_time,
            duration=end_time - start_time,
            tam_metin=transcript,
            is_news=False
        )

def cleanup_temp_files(file_paths: List[Path]):
    """Delete temporary files"""
    for path in file_paths:
        try:
            if path.exists():
                path.unlink()
                print(f"[DEBUG] Deleted: {path}")
        except Exception as e:
            print(f"[WARNING] Failed to delete {path}: {e}")

# API Endpoints

@app.post("/api/v1/pipelines/radyo-news-stream")
async def process_radyo_news_stream(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
):
    """
    Process radio audio file with Server-Sent Events for real-time progress
    """
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli."
        )
    
    async def event_generator():
        temp_files = []
        
        try:
            # Step 1: Save uploaded file
            yield f"data: {json.dumps({'type': 'init', 'message': 'Ses dosyası yüklendi, işleme başlıyor...'})}\n\n"
            
            # Save original file
            original_ext = Path(file.filename).suffix if file.filename else '.mp3'
            original_path = TEMP_AUDIO_DIR / f"radio_{id(file)}{original_ext}"
            temp_files.append(original_path)
            
            with open(original_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            # Step 2: Convert to WAV
            yield f"data: {json.dumps({'type': 'progress', 'step': 'conversion', 'message': 'Ses dosyası WAV formatına dönüştürülüyor...'})}\n\n"
            
            wav_path = TEMP_AUDIO_DIR / f"radio_{id(file)}.wav"
            temp_files.append(wav_path)
            
            if not convert_to_wav(original_path, wav_path):
                yield f"data: {json.dumps({'type': 'error', 'message': 'Ses dosyası dönüştürülemedi'})}\n\n"
                return
            
            # Step 3: Segment audio
            yield f"data: {json.dumps({'type': 'progress', 'step': 'segmentation', 'message': 'Ses segmentlere ayrılıyor (konuşma/müzik/gürültü)...'})}\n\n"
            
            all_segments = segment_audio(wav_path)
            
            # Step 4: Merge speech segments
            yield f"data: {json.dumps({'type': 'progress', 'step': 'merging', 'message': f'{len(all_segments)} segment bulundu, konuşma blokları birleştiriliyor...'})}\n\n"
            
            speech_blocks = merge_speech_segments(all_segments, max_gap_seconds=5.0)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'merged', 'message': f'{len(speech_blocks)} konuşma bloğu tespit edildi'})}\n\n"
            
            # Step 5: Process each speech block
            news_items = []
            
            for idx, block in enumerate(speech_blocks, start=1):
                # Extract segment
                segment_path = TEMP_AUDIO_DIR / f"segment_{id(file)}_{idx}.wav"
                temp_files.append(segment_path)
                
                yield f"data: {json.dumps({'type': 'progress', 'step': 'transcription', 'segment': idx, 'total': len(speech_blocks), 'message': f'Segment {idx}/{len(speech_blocks)}: Metne dönüştürülüyor...'})}\n\n"
                
                if not extract_audio_segment(wav_path, segment_path, block.start_time, block.end_time):
                    continue
                
                # Transcribe
                try:
                    transcript = await transcribe_segment(segment_path, openai_api_key)
                except Exception as e:
                    yield f"data: {json.dumps({'type': 'error', 'segment': idx, 'message': f'Transkripsiyon hatası: {str(e)}'})}\n\n"
                    continue
                
                # Classify and extract
                yield f"data: {json.dumps({'type': 'progress', 'step': 'analysis', 'segment': idx, 'total': len(speech_blocks), 'message': f'Segment {idx}/{len(speech_blocks)}: Haber analizi yapılıyor...'})}\n\n"
                
                news_item = await classify_and_extract_news(
                    transcript, idx, block.start_time, block.end_time, openai_api_key
                )
                
                if news_item and news_item.is_news:
                    news_items.append(news_item)
                    yield f"data: {json.dumps({'type': 'news_found', 'segment': idx, 'title': news_item.baslik, 'message': f'✓ Haber bulundu: {news_item.baslik}'})}\n\n"
                
                # Small delay
                await asyncio.sleep(0.2)
            
            # Calculate statistics
            total_duration = float(all_segments[-1].end_time) if all_segments else 0.0
            speech_count = sum(1 for s in all_segments if s.segment_type == 'speech')
            music_count = sum(1 for s in all_segments if s.segment_type == 'music')
            noise_count = sum(1 for s in all_segments if s.segment_type == 'noise')
            
            # Step 6: Send complete result
            result = RadioAnalysisResult(
                total_duration=total_duration,
                total_segments=len(all_segments),
                speech_segments=speech_count,
                music_segments=music_count,
                noise_segments=noise_count,
                news_count=len(news_items),
                segments=all_segments,
                news_items=news_items
            )
            
            yield f"data: {json.dumps({'type': 'complete', 'result': result.dict(), 'message': f'✓ Tamamlandı! {len(news_items)} haber bulundu'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Hata: {str(e)}'})}\n\n"
        
        finally:
            # Cleanup
            cleanup_temp_files(temp_files)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8008, reload=False)
