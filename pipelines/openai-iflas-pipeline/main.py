from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import requests
import openai
import os
import base64
import json
from io import BytesIO

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
DEEPSEEK_OCR_URL = os.getenv("DEEPSEEK_OCR_URL", "http://backend:8001/api/v1/ocr")
HUNYUAN_OCR_URL = os.getenv("HUNYUAN_OCR_URL", "http://hunyuan-backend:8006/api/v1/ocr")

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
    response_format: str = Form("json"),
    ocr_service: str = Form("deepseek")  # "deepseek" or "hunyuan"
):
    """
    Processes multiple bankruptcy/foreclosure notice images:
    1. Extracts text using selected OCR service (DeepSeek or Hunyuan)
    2. Uses OpenAI GPT-4 to extract structured fields
    """
    results = []
    
    # Select OCR URL based on user choice
    ocr_url = DEEPSEEK_OCR_URL if ocr_service.lower() == "deepseek" else HUNYUAN_OCR_URL

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
            
            ocr_response = requests.post(ocr_url, files=ocr_files, timeout=60)
            
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=False)
