from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import openai
import os
import base64
import json
from io import BytesIO
import pandas as pd
from bs4 import BeautifulSoup
from PIL import Image
import time

app = FastAPI(title="MTM İflas OCR Pipeline", version="1.0.0")

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
    return {"status": "running", "service": "openai-iflas-pipeline"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DEEPSEEK_OCR_URL = os.getenv('DEEPSEEK_OCR_URL', 'http://localhost:8001/api/v1/ocr')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

class IflasResult(BaseModel):
    ad_soyad_unvan: Optional[str] = None
    tckn: Optional[str] = None
    vkn: Optional[str] = None
    adres: Optional[str] = None
    icra_iflas_mudurlugu: Optional[str] = None
    dosya_yili: Optional[str] = None
    ilan_turu: Optional[str] = None
    ilan_tarihi: Optional[str] = None
    davacilar: Optional[List[str]] = None
    kaynak: Optional[str] = None
    raw_ocr_text: Optional[str] = None
    confidence: Optional[str] = None

def create_extraction_prompt(ocr_text: str) -> str:
    """
    Creates an engineered prompt for GPT-4 to extract bankruptcy notice fields.
    """
    return f"""Sen Türk hukuku ve iflas/icra ilanları konusunda uzman bir yapay zekasın.
Aşağıdaki OCR metni bir gazete sayfasından çıkarılmış iflas/icra ilanı içermektedir.
Bu metinden aşağıdaki alanları hassas bir şekilde çıkar. Eğer bir alan bulunamazsa, o alan için null döndür.

**ALANLAR VE AÇIKLAMALAR:**

1. **ad_soyad_unvan**: İflas/icra konusu olan kişi veya kurumun tam adı
2. **tckn**: TC Kimlik No (sadece 11 haneli, kişiler için)
3. **vkn**: Vergi Kimlik No (sadece 10 haneli, kurumlar için)
4. **adres**: Kişi veya kurumun tam adresi
5. **icra_iflas_mudurlugu**: İlandaki icra/iflas müdürlüğünün tam adı ve şehri
6. **dosya_yili**: Dosyanın yılı (sadece yıl, örn: "2024")
7. **ilan_turu**: İlan türü (örn: "Haciz İlanı", "İflas İlanı", "Satış İlanı", "Tahliye İlanı", "Ödeme Emri İlanı")
8. **ilan_tarihi**: İlanın yayınlandığı tarih (GG.AA.YYYY formatında)
9. **davacilar**: Davacıların isimleri (liste olarak, yoksa null)
10. **kaynak**: İlanın yayınlandığı gazete adı ve sayfa numarası (örn: "AKŞAM/SYF5")

**KURALLAR:**
- TC Kimlik No mutlaka 11 haneli olmalı
- Vergi Kimlik No mutlaka 10 haneli olmalı
- Tarihleri GG.AA.YYYY formatında döndür
- Eğer bir bilgi metinde yoksa veya belirsizse, o alan için null döndür
- Kesinlikle sadece geçerli JSON formatında yanıt ver, hiçbir açıklama ekleme
- Davacılar listesi boşsa null döndür
- İlan türünü yukarıdaki örneklerden birine benzer şekilde sınıflandır

**OCR METNİ:**
{ocr_text}

**ÇIKTI:**
Aşağıdaki JSON şemasını kullanarak yanıt ver:
{{
  "ad_soyad_unvan": "string veya null",
  "tckn": "string (11 haneli) veya null",
  "vkn": "string (10 haneli) veya null",
  "adres": "string veya null",
  "icra_iflas_mudurlugu": "string veya null",
  "dosya_yili": "string veya null",
  "ilan_turu": "string veya null",
  "ilan_tarihi": "string (GG.AA.YYYY) veya null",
  "davacilar": ["string"] veya null,
  "kaynak": "string veya null"
}}"""

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/v1/pipelines/iflas-ocr", response_model=List[IflasResult])
async def process_iflas_notice(
    files: List[UploadFile] = File(...),
    openai_api_key: Optional[str] = Form(None),
    response_format: str = Form("json")
):
    """
    Processes multiple bankruptcy/foreclosure notice images:
    1. Extracts text using DeepSeek OCR
    2. Uses OpenAI GPT-4 to extract structured fields
    """
    results = []
    
    # API key must be provided by user
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400, 
            detail="OpenAI API Key gerekli. Lütfen formdan API key'inizi girin."
        )

    for file in files:
        try:
            # Step 1: Call DeepSeek OCR
            # Reset file pointer if needed, though UploadFile usually handles this
            file_content = await file.read()
            # Fix: Use 'files' as key to match DeepSeek OCR endpoint expectation
            ocr_files = {"files": (file.filename, file_content, file.content_type)}
            
            # Use DeepSeek OCR
            ocr_response = requests.post(DEEPSEEK_OCR_URL, files=ocr_files, timeout=60)
            
            if not ocr_response.ok:
                print(f"Error processing {file.filename}: OCR failed with status {ocr_response.status_code}")
                results.append(IflasResult(raw_ocr_text=f"Error: OCR failed for {file.filename}"))
                continue
            
            ocr_data = ocr_response.json()
            # Fix: Handle list response from OCR service
            if isinstance(ocr_data, list) and len(ocr_data) > 0:
                ocr_text = ocr_data[0].get("text", "")
            elif isinstance(ocr_data, dict):
                ocr_text = ocr_data.get("text", "")
            else:
                ocr_text = ""
            
            if not ocr_text or len(ocr_text.strip()) < 10:
                print(f"Error processing {file.filename}: Text too short")
                results.append(IflasResult(raw_ocr_text=f"Error: Text too short for {file.filename}"))
                continue
            
            # Step 2: Call OpenAI GPT-4 for structured extraction
            client = openai.OpenAI(api_key=openai_api_key)
            
            prompt = create_extraction_prompt(ocr_text)
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Cost-effective model
                messages=[
                    {"role": "system", "content": "Sen yapılandırılmış veri çıkarımı yapan bir asistansın. Sadece geçerli JSON döndür."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent extraction
                max_tokens=1000,
                response_format={"type": "json_object"}
            )
            
            # Parse GPT-4 response
            extracted_data = json.loads(response.choices[0].message.content)
            
            # Return structured result
            results.append(IflasResult(
                **extracted_data,
                raw_ocr_text=ocr_text,
                confidence="high" if len(ocr_text) > 100 else "medium"
            ))
            
        except Exception as e:
            print(f"Error processing {file.filename}: {e}")
            results.append(IflasResult(raw_ocr_text=f"Error processing {file.filename}: {str(e)}"))
            
    return results

# Helper functions for Excel batch processing
def extract_image_url_from_medyatakip(clip_id: str) -> Optional[str]:
    """
    Constructs direct image URL from medyatakip GNO (clip ID).
    
    The image URL pattern is: https://imgsrv.medyatakip.com/store/clip?gno={GNO}
    
    Args:
        clip_id: The GNO (clip ID) from Excel (e.g., '2025110000041301')
    
    Returns:
        Direct image URL
    """
    try:
        # Direct image URL from GNO - no scraping needed!
        image_url = f"https://imgsrv.medyatakip.com/store/clip?gno={clip_id}"
        print(f"[DEBUG] Direct image URL for GNO {clip_id}: {image_url}")
        return image_url
        
    except Exception as e:
        print(f"[ERROR] Error constructing image URL from {clip_id}: {e}")
        return None


def download_image(image_url: str) -> Optional[bytes]:
    """
    Downloads image from URL and returns bytes.
    
    Args:
        image_url: URL of the image
    
    Returns:
        Image bytes or None if download fails
    """
    try:
        print(f"[DEBUG] Downloading image from: {image_url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(image_url, headers=headers, timeout=30)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', '')
        print(f"[DEBUG] Download successful. Content-Type: {content_type}, Size: {len(response.content)} bytes")
        
        # Verify it's an image
        try:
            img = Image.open(BytesIO(response.content))
            img.verify()
            print(f"[DEBUG] Image verification successful. Format: {img.format}")
        except Exception as e:
            print(f"[WARNING] Image verification failed: {e}. Content might not be a valid image.")
            # We might still want to return content if it's just a verification issue but looks like image
            if 'image' not in content_type:
                return None
        
        return response.content
        
    except Exception as e:
        print(f"[ERROR] Error downloading image from {image_url}: {e}")
        return None


class BatchIflasResult(BaseModel):
    """Result model for batch processing"""
    row: int
    clip_id: str
    status: str  # 'success', 'failed'
    data: Optional[Dict[str, Any]] = None
    raw_ocr_text: Optional[str] = None
    error: Optional[str] = None


class BatchProcessingSummary(BaseModel):
    """Summary of batch processing"""
    total: int
    processed: int
    successful: int
    failed: int
    results: List[BatchIflasResult]


@app.post("/api/v1/pipelines/iflas-ocr-batch", response_model=BatchProcessingSummary)
async def process_iflas_batch_from_excel(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    id_column: str = Form("A"),  # Excel column containing clip IDs
    max_concurrent: int = Form(5)  # Max concurrent processing
):
    """
    Processes multiple bankruptcy/foreclosure notices from Excel file containing medyatakip.com clip IDs.
    
    Process:
    1. Reads Excel file
    2. Extracts clip IDs from specified column
    3. For each ID:
       - Fetches the clip page from medyatakip.com
       - Extracts image URL from the page
       - Downloads the image
       - Performs OCR using DeepSeek
       - Extracts structured data using OpenAI GPT-4
    4. Returns summary and results
    """
    
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli. Lütfen API key'inizi girin."
        )
    
    results = []
    total = 0
    successful = 0
    failed = 0
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Get column index (A=0, B=1, etc.)
        col_idx = ord(id_column.upper()) - ord('A')
        
        if col_idx >= len(df.columns):
            raise HTTPException(
                status_code=400,
                detail=f"Kolon {id_column} Excel dosyasında bulunamadı."
            )
        
        # Get clip IDs from column
        clip_ids = df.iloc[:, col_idx].dropna().astype(str).tolist()
        total = len(clip_ids)
        
        print(f"Processing {total} clip IDs from Excel...")
        
        # Process each clip ID
        for idx, clip_id in enumerate(clip_ids, start=1):
            row_result = BatchIflasResult(
                row=idx,
                clip_id=clip_id,
                status="processing"
            )
            
            try:
                # Step 1: Extract image URL from medyatakip page
                print(f"[{idx}/{total}] Extracting image URL for clip {clip_id}...")
                image_url = extract_image_url_from_medyatakip(clip_id)
                
                if not image_url:
                    row_result.status = "failed"
                    row_result.error = "Sayfadaki görsele ulaşılamadı"
                    failed += 1
                    results.append(row_result)
                    continue
                
                # Step 2: Download image
                print(f"[{idx}/{total}] Downloading image from {image_url}...")
                image_bytes = download_image(image_url)
                
                if not image_bytes:
                    row_result.status = "failed"
                    row_result.error = "Görsel indirilemedi"
                    failed += 1
                    results.append(row_result)
                    continue
                
                # Step 3: Perform OCR
                print(f"[{idx}/{total}] Performing OCR with URL: {DEEPSEEK_OCR_URL}")
                ocr_files = {"files": (f"{clip_id}.jpg", image_bytes, "image/jpeg")}
                
                try:
                    ocr_response = requests.post(DEEPSEEK_OCR_URL, files=ocr_files, timeout=60)
                    
                    if not ocr_response.ok:
                        row_result.status = "failed"
                        row_result.error = f"OCR başarısız (HTTP {ocr_response.status_code})"
                        failed += 1
                        results.append(row_result)
                        continue
                        
                except requests.exceptions.ConnectionError:
                    error_msg = f"OCR servisine bağlanılamadı ({DEEPSEEK_OCR_URL}). Servis ayakta mı?"
                    print(f"[ERROR] {error_msg}")
                    row_result.status = "failed"
                    row_result.error = error_msg
                    failed += 1
                    results.append(row_result)
                    continue
                except Exception as e:
                    error_msg = f"OCR hatası: {str(e)}"
                    print(f"[ERROR] {error_msg}")
                    row_result.status = "failed"
                    row_result.error = error_msg
                    failed += 1
                    results.append(row_result)
                    continue
                
                ocr_data = ocr_response.json()
                if isinstance(ocr_data, list) and len(ocr_data) > 0:
                    ocr_text = ocr_data[0].get("text", "")
                elif isinstance(ocr_data, dict):
                    ocr_text = ocr_data.get("text", "")
                else:
                    ocr_text = ""
                
                if not ocr_text or len(ocr_text.strip()) < 10:
                    row_result.status = "failed"
                    row_result.error = "OCR metni çok kısa veya boş"
                    row_result.raw_ocr_text = ocr_text  # Save even if short
                    failed += 1
                    results.append(row_result)
                    continue
                
                # Store raw OCR text in result (birebir görsel yükleme ile aynı)
                row_result.raw_ocr_text = ocr_text
                
                # Step 4: Extract structured data with OpenAI
                print(f"[{idx}/{total}] Extracting structured data with OpenAI...")
                client = openai.OpenAI(api_key=openai_api_key)
                
                prompt = create_extraction_prompt(ocr_text)
                
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Sen yapılandırılmış veri çıkarımı yapan bir asistansın. Sadece geçerli JSON döndür."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1000,
                    response_format={"type": "json_object"}
                )
                
                extracted_data = json.loads(response.choices[0].message.content)
                
                # Add confidence based on OCR text length
                extracted_data['confidence'] = "high" if len(ocr_text) > 100 else "medium"
                
                row_result.status = "success"
                row_result.data = extracted_data
                successful += 1
                results.append(row_result)
                
                print(f"[{idx}/{total}] ✓ Success")
                
                # Rate limiting: small delay between requests
                if idx < total:
                    time.sleep(0.5)
                
            except Exception as e:
                print(f"[ERROR] Error processing clip {clip_id}: {type(e).__name__}: {e}")
                row_result.status = "failed"
                row_result.error = str(e)
                failed += 1
                results.append(row_result)
        
        print(f"Batch processing complete: {successful} successful, {failed} failed")
        
        return BatchProcessingSummary(
            total=total,
            processed=len(results),
            successful=successful,
            failed=failed,
            results=results
        )
        
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        raise HTTPException(
            status_code=400,
            detail=f"Excel dosyası okunamadı: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)
