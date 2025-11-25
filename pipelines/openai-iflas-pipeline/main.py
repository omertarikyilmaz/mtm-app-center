from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests
import openai
import os
import base64
from io import BytesIO

app = FastAPI(title="MTM İflas OCR Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DEEPSEEK_OCR_URL = os.getenv("DEEPSEEK_OCR_URL", "http://backend:8001/api/v1/ocr")

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

@app.post("/api/v1/pipelines/iflas-ocr", response_model=IflasResult)
async def process_iflas_notice(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None)
):
    """
    Processes a bankruptcy/foreclosure notice image:
    1. Extracts text using DeepSeek OCR
    2. Uses OpenAI GPT-4 to extract structured fields
    """
    try:
        # API key must be provided by user
        if not openai_api_key or not openai_api_key.strip():
            raise HTTPException(
                status_code=400, 
                detail="OpenAI API Key gerekli. Lütfen formdan API key'inizi girin."
            )
        
        # Step 1: Call DeepSeek OCR
        files = {"file": (file.filename, await file.read(), file.content_type)}
        ocr_response = requests.post(DEEPSEEK_OCR_URL, files=files, timeout=60)
        
        if not ocr_response.ok:
            raise HTTPException(
                status_code=500,
                detail=f"DeepSeek OCR hatası: {ocr_response.text}"
            )
        
        ocr_data = ocr_response.json()
        ocr_text = ocr_data.get("text", "")
        
        if not ocr_text or len(ocr_text.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="OCR metni çok kısa veya boş. Lütfen daha net bir görsel yükleyin."
            )
        
        print(f"DEBUG: OCR Text Length: {len(ocr_text)}")
        
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
        import json
        extracted_data = json.loads(response.choices[0].message.content)
        
        print(f"DEBUG: Extracted Data: {extracted_data}")
        
        # Return structured result
        return IflasResult(
            **extracted_data,
            raw_ocr_text=ocr_text,
            confidence="high" if len(ocr_text) > 100 else "medium"
        )
        
    except openai.APIError as e:
        print(f"OpenAI API Error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenAI API hatası: {str(e)}")
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        raise HTTPException(status_code=500, detail="OpenAI yanıtı parse edilemedi")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=False)
