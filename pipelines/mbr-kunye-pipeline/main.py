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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=False)
