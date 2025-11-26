from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import openai
import os
import json
from io import BytesIO
import pandas as pd
from PIL import Image
import time
import asyncio

app = FastAPI(title="MTM MBR Künye Pipeline", version="1.0.0")

# Configuration
DEEPSEEK_OCR_URL = os.getenv('DEEPSEEK_OCR_URL', 'http://localhost:8001/api/v1/ocr')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

class KunyePerson(BaseModel):
    ad_soyad: Optional[str] = None
    gorev: Optional[str] = None
    telefon: Optional[str] = None
    email: Optional[str] = None

class KunyeResult(BaseModel):
    yayin_adi: Optional[str] = None
    yayin_grubu: Optional[str] = None
    adres: Optional[str] = None
    telefon: Optional[str] = None
    faks: Optional[str] = None
    email: Optional[str] = None
    web_sitesi: Optional[str] = None
    kisiler: Optional[List[KunyePerson]] = None
    notlar: Optional[str] = None

class BatchKunyeResult(BaseModel):
    row: int
    clip_id: str
    status: str  # 'success', 'failed'
    data: Optional[KunyeResult] = None
    raw_ocr_text: Optional[str] = None
    error: Optional[str] = None

class BatchProcessingSummary(BaseModel):
    total: int
    processed: int
    successful: int
    failed: int
    results: List[BatchKunyeResult]

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
    return {"status": "running", "service": "mbr-kunye-pipeline"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Batch API Models
class BatchJobStatus(BaseModel):
    batch_id: str
    status: str  # validating, in_progress, completed, failed, etc.
    total_requests: int
    completed_requests: int
    failed_requests: int
    created_at: Optional[int] = None
    completed_at: Optional[int] = None

class BatchSubmissionResponse(BaseModel):
    batch_id: str
    status: str
    message: str
    ocr_results: List[Dict[str, Any]]  # OCR results for reference

# In-memory storage for batch tracking (production should use DB)
active_batches = {}

def create_kunye_prompt(ocr_text: str) -> str:
    return f"""Sen gazete ve dergi künyeleri konusunda uzman bir yapay zekasın.
Aşağıdaki OCR metni bir yayının künye bilgisini içermektedir. Metin İngilizce veya bozuk olabilir, sen Türkçe olarak yanıtla.

Bu metinden aşağıdaki bilgileri çıkar:

**YAYIN BİLGİLERİ:**
1. **yayin_adi**: Yayının adı
2. **yayin_grubu**: Yayın grubu veya sahibi
3. **adres**: Yayının açık adresi
4. **telefon**: Yayının telefon numarası
5. **faks**: Yayının faks numarası
6. **email**: Yayının genel email adresi
7. **web_sitesi**: Yayının web sitesi

**KİŞİLER LİSTESİ:**
Künyede geçen TÜM kişileri ve görevlerini çıkar.
- **ad_soyad**: Kişinin adı soyadı
- **gorev**: Kişinin görevi (Örn: İmtiyaz Sahibi, Genel Yayın Yönetmeni, Haber Müdürü, Muhabir vb.)
- **telefon**: Kişiye özel telefon varsa
- **email**: Kişiye özel email varsa

**NOTLAR:**
Eğer künyeden çıkarılabilecek başka önemli bilgiler varsa (baskı tesisi, dağıtım vb.) buraya not olarak ekle.

**KURALLAR:**
- Sadece geçerli JSON formatında yanıt ver.
- Kişiler listesi boşsa boş liste döndür.
- Bulunamayan alanlar için null döndür.

**OCR METNİ:**
{ocr_text}

**JSON ŞEMASI:**
{{
  "yayin_adi": "string veya null",
  "yayin_grubu": "string veya null",
  "adres": "string veya null",
  "telefon": "string veya null",
  "faks": "string veya null",
  "email": "string veya null",
  "web_sitesi": "string veya null",
  "kisiler": [
    {{
      "ad_soyad": "string",
      "gorev": "string",
      "telefon": "string veya null",
      "email": "string veya null"
    }}
  ],
  "notlar": "string veya null"
}}
"""

def download_image(image_url: str) -> Optional[bytes]:
    try:
        print(f"[DEBUG] Downloading image from: {image_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(image_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # Verify it's an image
        try:
            img = Image.open(BytesIO(response.content))
            img.verify()
        except Exception as e:
            print(f"[WARNING] Image verification failed: {e}")
            if 'image' not in response.headers.get('content-type', ''):
                return None
        
        return response.content
    except Exception as e:
        print(f"[ERROR] Error downloading image from {image_url}: {e}")
        return None

@app.post("/api/v1/pipelines/mbr-kunye-batch-stream")
async def process_mbr_kunye_batch_stream(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    id_column: str = Form("A"),
):
    """
    Processes batch with Server-Sent Events for real-time progress updates
    """
    from fastapi.responses import StreamingResponse
    
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli."
        )
    
    async def event_generator():
        results = []
        total = 0
        successful = 0
        failed = 0
        
        try:
            # Read Excel file
            contents = await file.read()
            df = pd.read_excel(BytesIO(contents))
            
            # Get column index (A=0)
            col_idx = 0
            if id_column.isalpha():
                col_idx = ord(id_column.upper()) - 65
                
            total = len(df)
            
            # Send initial status
            yield f"data: {json.dumps({'type': 'init', 'total': total})}\n\n"
            
            for idx, row in df.iterrows():
                # Get Clip ID
                try:
                    clip_id = str(row.iloc[col_idx]).strip()
                    if pd.isna(row.iloc[col_idx]) or not clip_id:
                        continue
                except:
                    continue
                    
                row_result = BatchKunyeResult(
                    row=idx + 2,
                    clip_id=clip_id,
                    status="processing"
                )
                
                try:
                    # Step 1: Image URL
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'url', 'message': 'Görsel URL oluşturuluyor...'})}\n\n"
                    image_url = f"https://imgsrv.medyatakip.com/store/clip?gno={clip_id}"
                    
                    # Step 2: Download
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'download', 'message': 'Görsel indiriliyor...'})}\n\n"
                    image_bytes = download_image(image_url)
                    if not image_bytes:
                        row_result.status = "failed"
                        row_result.error = "Görsel indirilemedi"
                        failed += 1
                        results.append(row_result)
                        yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'Görsel indirilemedi'})}\n\n"
                        continue
                    
                    # Step 3: OCR
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'ocr', 'message': 'OCR işlemi yapılıyor...'})}\n\n"
                    ocr_files = {"files": (f"{clip_id}.jpg", image_bytes, "image/jpeg")}
                    
                    try:
                        ocr_response = requests.post(DEEPSEEK_OCR_URL, files=ocr_files, timeout=60)
                        if not ocr_response.ok:
                            raise Exception(f"OCR HTTP {ocr_response.status_code}")
                    except Exception as e:
                        row_result.status = "failed"
                        row_result.error = f"OCR Hatası: {str(e)}"
                        failed += 1
                        results.append(row_result)
                        yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': f'OCR Hatası: {str(e)}'})}\n\n"
                        continue
                    
                    ocr_data = ocr_response.json()
                    ocr_text = ""
                    if isinstance(ocr_data, list) and len(ocr_data) > 0:
                        ocr_text = ocr_data[0].get("text", "")
                    elif isinstance(ocr_data, dict):
                        ocr_text = ocr_data.get("text", "")
                    
                    if not ocr_text or len(ocr_text.strip()) < 10:
                        row_result.status = "failed"
                        row_result.error = "OCR metni yetersiz"
                        row_result.raw_ocr_text = ocr_text
                        failed += 1
                        results.append(row_result)
                        yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'OCR metni yetersiz'})}\n\n"
                        continue
                    
                    row_result.raw_ocr_text = ocr_text
                    
                    # Step 4: OpenAI
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'ai', 'message': 'Yapay zeka ile veri çıkarımı yapılıyor...'})}\n\n"
                    client = openai.OpenAI(api_key=openai_api_key)
                    prompt = create_kunye_prompt(ocr_text)
                    
                    response = client.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "system", "content": "Sen yapılandırılmış veri çıkarımı yapan bir asistansın. Sadece geçerli JSON döndür."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.1,
                        max_tokens=2000,
                        response_format={"type": "json_object"}
                    )
                    
                    extracted_data = json.loads(response.choices[0].message.content)
                    
                    row_result.status = "success"
                    row_result.data = KunyeResult(**extracted_data)
                    successful += 1
                    results.append(row_result)
                    
                    # Success notification
                    yield f"data: {json.dumps({'type': 'success', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'Başarıyla tamamlandı'})}\n\n"
                    
                    # Small delay for rate limiting
                    await asyncio.sleep(0.3)
                        
                except Exception as e:
                    print(f"[ERROR] Error processing {clip_id}: {e}")
                    row_result.status = "failed"
                    row_result.error = str(e)
                    failed += 1
                    results.append(row_result)
                    yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': str(e)})}\n\n"
            
            # Send final summary
            summary = {
                'type': 'complete',
                'total': total,
                'processed': len(results),
                'successful': successful,
                'failed': failed,
                'results': [r.dict() for r in results]
            }
            yield f"data: {json.dumps(summary)}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Excel hatası: {str(e)}'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

# Keep old endpoint for backward compatibility
@app.post("/api/v1/pipelines/mbr-kunye-batch", response_model=BatchProcessingSummary)
async def process_mbr_kunye_batch(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    id_column: str = Form("A"),
    max_concurrent: int = Form(5)
):
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli."
        )
    
    results = []
    total = 0
    successful = 0
    failed = 0
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Get column index (A=0)
        col_idx = 0
        if id_column.isalpha():
            col_idx = ord(id_column.upper()) - 65
            
        total = len(df)
        print(f"Processing {total} rows from Excel...")
        
        for idx, row in df.iterrows():
            # Get Clip ID
            try:
                clip_id = str(row.iloc[col_idx]).strip()
                if pd.isna(row.iloc[col_idx]) or not clip_id:
                    continue
            except:
                continue
                
            row_result = BatchKunyeResult(
                row=idx + 2, # Excel is 1-indexed + header
                clip_id=clip_id,
                status="processing"
            )
            
            try:
                # 1. Construct Image URL
                image_url = f"https://imgsrv.medyatakip.com/store/clip?gno={clip_id}"
                
                # 2. Download Image
                image_bytes = download_image(image_url)
                if not image_bytes:
                    row_result.status = "failed"
                    row_result.error = "Görsel indirilemedi"
                    failed += 1
                    results.append(row_result)
                    continue
                
                # 3. DeepSeek OCR
                print(f"[{idx+1}/{total}] Performing OCR for {clip_id}...")
                ocr_files = {"files": (f"{clip_id}.jpg", image_bytes, "image/jpeg")}
                
                try:
                    ocr_response = requests.post(DEEPSEEK_OCR_URL, files=ocr_files, timeout=60)
                    if not ocr_response.ok:
                        raise Exception(f"OCR HTTP {ocr_response.status_code}")
                except Exception as e:
                    row_result.status = "failed"
                    row_result.error = f"OCR Hatası: {str(e)}"
                    failed += 1
                    results.append(row_result)
                    continue
                
                ocr_data = ocr_response.json()
                ocr_text = ""
                if isinstance(ocr_data, list) and len(ocr_data) > 0:
                    ocr_text = ocr_data[0].get("text", "")
                elif isinstance(ocr_data, dict):
                    ocr_text = ocr_data.get("text", "")
                
                if not ocr_text or len(ocr_text.strip()) < 10:
                    row_result.status = "failed"
                    row_result.error = "OCR metni yetersiz"
                    row_result.raw_ocr_text = ocr_text
                    failed += 1
                    results.append(row_result)
                    continue
                
                row_result.raw_ocr_text = ocr_text
                
                # 4. OpenAI Extraction
                print(f"[{idx+1}/{total}] Extracting data with OpenAI...")
                client = openai.OpenAI(api_key=openai_api_key)
                prompt = create_kunye_prompt(ocr_text)
                
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Sen yapılandırılmış veri çıkarımı yapan bir asistansın. Sadece geçerli JSON döndür."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=2000,
                    response_format={"type": "json_object"}
                )
                
                extracted_data = json.loads(response.choices[0].message.content)
                
                row_result.status = "success"
                row_result.data = KunyeResult(**extracted_data)
                successful += 1
                results.append(row_result)
                
                print(f"[{idx+1}/{total}] ✓ Success")
                
                # Rate limit
                if idx < total - 1:
                    time.sleep(0.5)
                    
            except Exception as e:
                print(f"[ERROR] Error processing {clip_id}: {e}")
                row_result.status = "failed"
                row_result.error = str(e)
                failed += 1
                results.append(row_result)
        
        return BatchProcessingSummary(
            total=total,
            processed=len(results),
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        print(f"Error reading Excel: {e}")
        raise HTTPException(status_code=400, detail=f"Excel hatası: {str(e)}")

# Batch API Endpoints

@app.post("/api/v1/pipelines/mbr-kunye-batch-hybrid")
async def process_mbr_kunye_batch_hybrid(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    id_column: str = Form("A"),
):
    """
    Hybrid approach with SSE: OCR synchronously with live progress, then submit to OpenAI Batch API
    Returns batch_id via SSE after OCR phase completes
    """
    from fastapi.responses import StreamingResponse
    
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(status_code=400, detail="OpenAI API Key gerekli.")
    
    async def event_generator():
        ocr_results = []
        
        try:
            # Phase 1: Perform OCR (with SSE progress)
            contents = await file.read()
            df = pd.read_excel(BytesIO(contents))
            
            col_idx = 0
            if id_column.isalpha():
                col_idx = ord(id_column.upper()) - 65
                
            total = len(df)
            
            # Send init
            yield f"data: {json.dumps({'type': 'init', 'phase': 'ocr', 'total': total})}\n\n"
            
            for idx, row in df.iterrows():
                try:
                    clip_id = str(row.iloc[col_idx]).strip()
                    if pd.isna(row.iloc[col_idx]) or not clip_id:
                        continue
                except:
                    continue
                    
                try:
                    # Download
                    yield f"data: {json.dumps({'type': 'progress', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'download', 'message': 'Görsel indiriliyor...'})}\n\n"
                    image_url = f"https://imgsrv.medyatakip.com/store/clip?gno={clip_id}"
                    image_bytes = download_image(image_url)
                    
                    if not image_bytes:
                        ocr_results.append({
                            "custom_id": f"clip-{clip_id}",
                            "clip_id": clip_id,
                            "row": idx + 2,
                            "ocr_text": None,
                            "error": "Görsel indirilemedi"
                        })
                        yield f"data: {json.dumps({'type': 'error', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'Görsel indirilemedi'})}\n\n"
                        continue
                    
                    # OCR
                    yield f"data: {json.dumps({'type': 'progress', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'step': 'ocr', 'message': 'OCR işleniyor...'})}\n\n"
                    ocr_files = {"files": (f"{clip_id}.jpg", image_bytes, "image/jpeg")}
                    ocr_response = requests.post(DEEPSEEK_OCR_URL, files=ocr_files, timeout=60)
                    
                    if not ocr_response.ok:
                        ocr_results.append({
                            "custom_id": f"clip-{clip_id}",
                            "clip_id": clip_id,
                            "row": idx + 2,
                            "ocr_text": None,
                            "error": f"OCR HTTP {ocr_response.status_code}"
                        })
                        yield f"data: {json.dumps({'type': 'error', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': f'OCR hatası'})}\n\n"
                        continue
                    
                    ocr_data = ocr_response.json()
                    ocr_text = ""
                    if isinstance(ocr_data, list) and len(ocr_data) > 0:
                        ocr_text = ocr_data[0].get("text", "")
                    elif isinstance(ocr_data, dict):
                        ocr_text = ocr_data.get("text", "")
                    
                    if not ocr_text or len(ocr_text.strip()) < 10:
                        ocr_results.append({
                            "custom_id": f"clip-{clip_id}",
                            "clip_id": clip_id,
                            "row": idx + 2,
                            "ocr_text": ocr_text,
                            "error": "OCR metni yetersiz"
                        })
                        yield f"data: {json.dumps({'type': 'error', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'OCR metni yetersiz'})}\n\n"
                        continue
                    
                    ocr_results.append({
                        "custom_id": f"clip-{clip_id}",
                        "clip_id": clip_id,
                        "row": idx + 2,
                        "ocr_text": ocr_text,
                        "error": None
                    })
                    
                    yield f"data: {json.dumps({'type': 'success', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': 'OCR tamamlandı'})}\n\n"
                    
                except Exception as e:
                    print(f"[ERROR] OCR failed for {clip_id}: {e}")
                    ocr_results.append({
                        "custom_id": f"clip-{clip_id}",
                        "clip_id": clip_id,
                        "row": idx + 2,
                        "ocr_text": None,
                        "error": str(e)
                    })
                    yield f"data: {json.dumps({'type': 'error', 'phase': 'ocr', 'row': idx+1, 'total': total, 'clip_id': clip_id, 'message': str(e)})}\n\n"
            
            # Phase 2: Create Batch
            yield f"data: {json.dumps({'type': 'progress', 'phase': 'batch', 'message': 'Batch dosyası hazırlanıyor...'})}\n\n"
            
            successful_ocr = [r for r in ocr_results if r["ocr_text"] and not r["error"]]
            
            if not successful_ocr:
                yield f"data: {json.dumps({'type': 'error', 'phase': 'batch', 'message': 'Hiçbir OCR başarılı olmadı'})}\n\n"
                return
            
            # Create JSONL for batch
            batch_requests = []
            for ocr_result in successful_ocr:
                prompt = create_kunye_prompt(ocr_result["ocr_text"])
                batch_requests.append({
                    "custom_id": ocr_result["custom_id"],
                    "method": "POST",
                    "url": "/v1/chat/completions",
                    "body": {
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": "Sen yapılandırılmış veri çıkarımı yapan bir asistansın. Sadece geçerli JSON döndür."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.1,
                        "max_tokens": 2000,
                        "response_format": {"type": "json_object"}
                    }
                })
            
            # Write to temporary file
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
                for req in batch_requests:
                    f.write(json.dumps(req) + '\n')
                batch_file_path = f.name
            
            # Upload to OpenAI
            yield f"data: {json.dumps({'type': 'progress', 'phase': 'batch', 'message': 'OpenAI\'a yükleniyor...'})}\n\n"
            client = openai.OpenAI(api_key=openai_api_key)
            
            with open(batch_file_path, 'rb') as f:
                batch_input_file = client.files.create(file=f, purpose="batch")
            
            # Create batch job
            yield f"data: {json.dumps({'type': 'progress', 'phase': 'batch', 'message': 'Batch job oluşturuluyor...'})}\n\n"
            batch_job = client.batches.create(
                input_file_id=batch_input_file.id,
                endpoint="/v1/chat/completions",
                completion_window="24h"
            )
            
            # Clean up temp file
            os.unlink(batch_file_path)
            
            # Store batch info
            active_batches[batch_job.id] = {
                "batch_id": batch_job.id,
                "openai_api_key": openai_api_key,
                "ocr_results": ocr_results,
                "created_at": batch_job.created_at,
                "status": batch_job.status
            }
            
            # Send completion
            yield f"data: {json.dumps({'type': 'batch_submitted', 'batch_id': batch_job.id, 'status': batch_job.status, 'successful_ocr': len(successful_ocr), 'message': f'Batch gönderildi! ID: {batch_job.id}'})}\n\n"
                
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': f'Hata: {str(e)}'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@app.get("/api/v1/pipelines/mbr-kunye-batch-status/{batch_id}", response_model=BatchJobStatus)
async def get_batch_status(batch_id: str):
    """
    Check the status of a batch job
    """
    if batch_id not in active_batches:
        raise HTTPException(status_code=404, detail="Batch ID bulunamadı")
    
    batch_info = active_batches[batch_id]
    openai_api_key = batch_info["openai_api_key"]
    
    try:
        client = openai.OpenAI(api_key=openai_api_key)
        batch = client.batches.retrieve(batch_id)
        
        # Update local storage
        active_batches[batch_id]["status"] = batch.status
        
        return BatchJobStatus(
            batch_id=batch_id,
            status=batch.status,
            total_requests=batch.request_counts.total,
            completed_requests=batch.request_counts.completed,
            failed_requests=batch.request_counts.failed,
            created_at=batch.created_at,
            completed_at=batch.completed_at
        )
    except Exception as e:
        print(f"[ERROR] Status check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/pipelines/mbr-kunye-batch-results/{batch_id}", response_model=BatchProcessingSummary)
async def get_batch_results(batch_id: str):
    """
    Retrieve results from a completed batch job
    """
    if batch_id not in active_batches:
        raise HTTPException(status_code=404, detail="Batch ID bulunamadı")
    
    batch_info = active_batches[batch_id]
    openai_api_key = batch_info["openai_api_key"]
    ocr_results_map = {r["custom_id"]: r for r in batch_info["ocr_results"]}
    
    try:
        client = openai.OpenAI(api_key=openai_api_key)
        batch = client.batches.retrieve(batch_id)
        
        if batch.status != "completed":
            raise HTTPException(status_code=400, detail=f"Batch henüz tamamlanmadı. Durum: {batch.status}")
        
        # Download results
        result_file_id = batch.output_file_id
        file_response = client.files.content(result_file_id)
        
        # Parse results
        results = []
        successful = 0
        failed = 0
        
        for line in file_response.text.split('\n'):
            if not line.strip():
                continue
            
            result_data = json.loads(line)
            custom_id = result_data.get("custom_id")
            ocr_info = ocr_results_map.get(custom_id, {})
            
            if result_data.get("error"):
                results.append(BatchKunyeResult(
                    row=ocr_info.get("row", 0),
                    clip_id=ocr_info.get("clip_id", "unknown"),
                    status="failed",
                    error=str(result_data["error"]),
                    raw_ocr_text=ocr_info.get("ocr_text")
                ))
                failed += 1
            else:
                response_body = result_data["response"]["body"]
                extracted_text = response_body["choices"][0]["message"]["content"]
                extracted_data = json.loads(extracted_text)
                
                results.append(BatchKunyeResult(
                    row=ocr_info.get("row", 0),
                    clip_id=ocr_info.get("clip_id", "unknown"),
                    status="success",
                    data=KunyeResult(**extracted_data),
                    raw_ocr_text=ocr_info.get("ocr_text")
                ))
                successful += 1
        
        return BatchProcessingSummary(
            total=batch.request_counts.total,
            processed=batch.request_counts.completed + batch.request_counts.failed,
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        print(f"[ERROR] Results retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8006, reload=False)
