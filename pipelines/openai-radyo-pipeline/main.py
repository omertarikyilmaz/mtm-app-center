from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import openai
import os
import json
import tempfile
import asyncio
from pathlib import Path

app = FastAPI(title="MTM Radyo News Pipeline", version="2.0.0")

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
TEMP_AUDIO_DIR = Path("/tmp/audio")
TEMP_AUDIO_DIR.mkdir(exist_ok=True, parents=True)

# Models
class NewsItem(BaseModel):
    """Structured news item"""
    baslik: str
    kategori: str  # politika, ekonomi, spor, saglik, teknoloji, guncel, diger
    ozet: str  # 2-3 cümle
    tam_metin: str
    tarih: Optional[str] = None
    kisiler: Optional[List[str]] = None
    kurumlar: Optional[List[str]] = None
    yerler: Optional[List[str]] = None
    ozel_isimler: Optional[List[str]] = None  # Tüm özel isimler (proper nouns)

class RadioAnalysisResult(BaseModel):
    """Complete analysis result"""
    total_news_count: int
    categories: dict  # kategori: sayı
    news_items: List[NewsItem]
    raw_transcript: str

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_details = traceback.format_exc()
    print(f"Global Error: {error_details}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"},
    )

@app.get("/")
async def root():
    return {"status": "running", "service": "openai-radyo-pipeline", "version": "2.0.0"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Functions

async def transcribe_audio(audio_path: Path, api_key: str) -> str:
    """
    Transcribe entire audio file using OpenAI Whisper API.
    For large files (>25MB), automatically chunks into segments.
    
    Args:
        audio_path: Path to audio file
        api_key: OpenAI API key
    
    Returns:
        Full transcript text
    """
    try:
        from pydub import AudioSegment
        import math
        
        print(f"[DEBUG] Transcribing audio: {audio_path}")
        
        # Load audio file
        audio = AudioSegment.from_file(str(audio_path))
        duration_ms = len(audio)
        duration_min = duration_ms / 60000
        
        print(f"[DEBUG] Audio duration: {duration_min:.1f} minutes")
        
        # Chunk size: 10 minutes (600,000 ms)
        CHUNK_DURATION_MS = 10 * 60 * 1000
        
        # If file is small enough, process directly
        if duration_ms <= CHUNK_DURATION_MS:
            print(f"[DEBUG] File small enough, direct transcription")
            client = openai.OpenAI(api_key=api_key)
            
            with open(audio_path, 'rb') as audio_file:
                transcript = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language="tr",
                    response_format="text"
                )
            
            print(f"[DEBUG] Transcription complete ({len(transcript)} chars)")
            return transcript
        
        # Large file - chunk it
        num_chunks = math.ceil(duration_ms / CHUNK_DURATION_MS)
        print(f"[DEBUG] Large file, splitting into {num_chunks} chunks")
        
        transcripts = []
        client = openai.OpenAI(api_key=api_key)
        
        for i in range(num_chunks):
            start_ms = i * CHUNK_DURATION_MS
            end_ms = min((i + 1) * CHUNK_DURATION_MS, duration_ms)
            
            print(f"[DEBUG] Processing chunk {i+1}/{num_chunks} ({start_ms/60000:.1f}-{end_ms/60000:.1f} min)")
            
            # Extract chunk
            chunk = audio[start_ms:end_ms]
            
            # Save chunk to temp file
            chunk_path = audio_path.parent / f"chunk_{i}_{audio_path.name}"
            chunk.export(str(chunk_path), format="mp3")
            
            try:
                # Transcribe chunk
                with open(chunk_path, 'rb') as chunk_file:
                    chunk_transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=chunk_file,
                        language="tr",
                        response_format="text"
                    )
                
                transcripts.append(chunk_transcript)
                print(f"[DEBUG] Chunk {i+1} transcribed ({len(chunk_transcript)} chars)")
                
            finally:
                # Clean up chunk file
                if chunk_path.exists():
                    chunk_path.unlink()
        
        # Combine all transcripts
        full_transcript = " ".join(transcripts)
        print(f"[DEBUG] All chunks transcribed, total: {len(full_transcript)} chars")
        
        return full_transcript
        
    except Exception as e:
        print(f"[ERROR] Transcription failed: {e}")
        raise

def create_news_extraction_prompt() -> str:
    """Create detailed prompt for GPT to extract news from transcript"""
    return """Sen bir profesyonel radyo haber analisti ve editörüsün. Uzun yıllardır radyo yayınlarını analiz ediyorsun.

**GÖREVİN:**
Aşağıda bir radyo kanalının 1 saatlik yayın transkripsiyonu verilecek. Bu transkriptte:
- Haberler
- Reklamlar
- Müzik programları
- Jingle'lar
- Sunucu sohbetleri
- Program tanıtımları
karışık halde bulunuyor.

**SADECE HABER İÇERİKLERİNİ** tespit edip yapılandırılmış formatta döndürmelisin.

---

## 🚫 HABER OLMAYAN İÇERİKLER (ATLANMALI):

1. **REKLAMLAR:**
   - Ürün/hizmet tanıtımları ("...satın alın", "...arayın", "kampanya", "indirim")
   - Marka/şirket isimleri (ürün reklamı bağlamında)
   - Telefon numaraları, web siteleri (reklam bağlamında)
   - "Sponsorumuz", "Destekçimiz" gibi ifadeler

2. **MÜZİK PROGRAMLARI:**
   - Şarkı sözleri
   - Şarkıcı/albüm tanıtımları
   - Müzik listesi/chart haberleri
   - "Bu hafta en çok dinlenen" gibi içerikler

3. **PROGRAM İÇERİKLERİ:**
   - Sunucu sohbetleri (haber dışı)
   - Program tanıtımları
   - Dinleyici mesajları
   - Jingle'lar, ara müzikleri

4. **DİĞER:**
   - Hava durumu tahmini (önemli hava olayı değilse)
   - Bugün tarihte ne oldu
   - Horoskop/astroloji
   - Eğlence/magazin (önemsiz dedikodu)

---

## ✅ HABER OLAN İÇERİKLER (ALINMALI):

1. **POLİTİKA:**
   - Hükümet kararları, yasalar
   - Seçimler, referandumlar
   - Siyasi açıklamalar (önemli)
   - Uluslararası ilişkiler

2. **EKONOMİ:**
   - Ekonomik veriler (enflasyon, büyüme, işsizlik)
   - Borsa, döviz, altın haberleri
   - Şirket haberleri (önemli gelişmeler)
   - Ekonomi politikaları

3. **SPOR:**
   - Maç sonuçları (önemli müsabakalar)
   - Transfer haberleri
   - Şampiyonluklar, milli takım
   - Spor politikaları

4. **GÜNCEL OLAYLAR:**
   - Kazalar, yangınlar, doğal afetler
   - Suç haberleri (önemli)
   - Protestolar, toplumsal olaylar
   - Mahkeme kararları

5. **SAĞLIK & BİLİM:**
   - Salgınlar, aşılar
   - Bilimsel keşifler
   - Sağlık politikaları

6. **TEKNOLOJİ:**
   - Önemli teknoloji gelişmeleri
   - Siber güvenlik olayları
   - Yapay zeka, uzay haberleri

7. **KÜLTÜR & EĞİTİM:**
   - Önemli kültürel etkinlikler
   - Eğitim politikaları
   - Üniversite gelişmeleri

---

## 📋 ÇIKTI FORMATI:

Every haber için şu bilgileri çıkar:

```json
{
  "baslik": "Kısa, öz başlık (5-10 kelime)",
  "kategori": "politika|ekonomi|spor|saglik|teknoloji|guncel|diger",
  "ozet": "2-3 cümlelik özet. Ana olay ve sonucu içermeli.",
  "tam_metin": "Haberin transkriptteki tam metni (aynen)",
  "tarih": "Metinde geçiyorsa tarih/saat bilgisi (örn: '3 Aralık 2024', '15:30')",
  "kisiler": ["Metinde geçen kişi isimleri (politikacı, spor cu, bilim insanı, vb)"],
  "kurumlar": ["Bahsedilen kurum/kuruluşlar (bakanlık, şirket, parti, vb)"],
  "yerler": ["Bahsedilen şehir/ülke/bölge isimleri"],
  "ozel_isimler": ["BÜTÜN özel isimler - kişi, kurum, yer, marka, ürün, etkinlik, proje adları - Büyük harfle başlayan TÜM isimler"]
}
```

**ÖZEL İSİMLER (ozel_isimler) KURALI:**
- Metinde geçen TÜM proper noun'ları (özel isimleri) çıkar
- Kişi adları: "Recep Tayyip Erdoğan", "Lionel Messi"
- Kurum/Şirket: "Türkiye Cumhuriyeti", "Apple", "NATO"
- Yerler: "İstanbul", "Avrupa Birliği", "Boğaziçi Köprüsü"
- Marka/Ürün: "iPhone 15", "Tesla Model 3"
- Etkinlik/Proje: "Dünya Kupası", "Kanal İstanbul"
- Yasanışlarına göre büyük harfle yazılan HER ŞEY
- Tekrar olabilir, sorun değil - hepsini listele

---

## ⚠️ ÖNEMLİ KURALLAR:

1. **NET HABER OLMAYAN HİÇBİR ŞEY EKLEME**
   - Şüpheli içerikleri atla
   - "Belki haber olabilir" deme, emin ol

2. **REKLAM TESPİTİ:**
   - Ürün/marka ismi + övgü = REKLAM
   - Telefon/web adresi = REKLAM
   - "Kampanya", "indirim", "satın al" = REKLAM

3. **KATEGORİ SINIFLANDIRMASI:**
   - Her haberi en uygun kategoriye ata
   - Kararsızsan "guncel" kullan
   - "diger" sadece hiçbiri uymuyorsa

4. **ÖZ VE NET OL:**
   - Başlık: Kısa ve açıklayıcı
   - Özet: Sadece önemli bilgiler
   - Tam metin: Transkriptteki ilgili kısmın tamamı
   - Özel isimler: Eksik bırakma, hepsini al

5. **BOŞLUK OLMASIN:**
   - Hiç haber yoksa bile boş array dön: `{"news_items": []}`
   - `null` veya `undefined` döndürme

---

## 📤 JSON ŞEMASI:

```json
{
  "news_items": [
    {
      "baslik": "string",
      "kategori": "politika|ekonomi|spor|saglik|teknoloji|guncel|diger",
      "ozet": "string",
      "tam_metin": "string",
      "tarih": "string veya null",
      "kisiler": ["string"] veya null,
      "kurumlar": ["string"] veya null,
      "yerler": ["string"] veya null,
      "ozel_isimler": ["string"] veya null
    }
  ]
}
```

**SADECE GEÇERLİ JSON DÖNDÜR. AÇIKLAMA YAPMA.**
"""

async def extract_news_from_transcript(transcript: str, api_key: str) -> List[NewsItem]:
    """
    Extract news items from transcript using GPT-4o-mini
    
    Args:
        transcript: Full radio transcript
        api_key: OpenAI API key
    
    Returns:
        List of NewsItem objects
    """
    try:
        print(f"[DEBUG] Extracting news from transcript ({len(transcript)} chars)")
        client = openai.OpenAI(api_key=api_key)
        
        system_prompt = create_news_extraction_prompt()
        user_prompt = f"**RADYO TRANSKRİPTİ:**\n\n{transcript}\n\n---\n\n**Yukarıdaki transkriptten SADECE HABER içeriklerini JSON formatında çıkar:**"
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=16000,
            response_format={"type": "json_object"}
        )
        
        result_text = response.choices[0].message.content
        result_data = json.loads(result_text)
        
        news_items = []
        for item in result_data.get('news_items', []):
            try:
                news_item = NewsItem(**item)
                news_items.append(news_item)
            except Exception as e:
                print(f"[WARNING] Failed to parse news item: {e}")
                continue
        
        print(f"[DEBUG] Extracted {len(news_items)} news items")
        return news_items
        
    except Exception as e:
        print(f"[ERROR] News extraction failed: {e}")
        raise

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
            
            # Save audio file
            file_ext = Path(file.filename).suffix if file.filename else '.mp3'
            audio_path = TEMP_AUDIO_DIR / f"radio_{id(file)}{file_ext}"
            temp_files.append(audio_path)
            
            with open(audio_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            file_size_mb = len(content) / 1024 / 1024
            yield f"data: {json.dumps({'type': 'progress', 'step': 'uploaded', 'message': f'Dosya yüklendi ({file_size_mb:.1f} MB)'})}\n\n"
            
            # Step 2: Transcribe with Whisper (auto-chunks if needed)
            yield f"data: {json.dumps({'type': 'progress', 'step': 'transcription', 'message': 'Whisper ile transkript alınıyor... (1-3 dakika sürebilir)'})}\n\n"
            
            transcript = await transcribe_audio(audio_path, openai_api_key)
            
            if not transcript or len(transcript) < 100:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Transkript alınamadı veya çok kısa. Ses dosyasını kontrol edin.'})}\n\n"
                return
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'transcribed', 'message': f'✓ Transkript alındı ({len(transcript)} karakter)'})}\n\n"
            
            # Step 3: Extract news with GPT
            yield f"data: {json.dumps({'type': 'progress', 'step': 'analysis', 'message': 'GPT ile haber analizi yapılıyor... (30-60 saniye)'})}\n\n"
            
            news_items = await extract_news_from_transcript(transcript, openai_api_key)
            
            yield f"data: {json.dumps({'type': 'progress', 'step': 'analyzed', 'message': f'✓ Analiz tamamlandı! {len(news_items)} haber bulundu'})}\n\n"
            
            # Calculate statistics
            categories = {}
            for news in news_items:
                categories[news.kategori] = categories.get(news.kategori, 0) + 1
            
            # Step 4: Send complete result
            result = RadioAnalysisResult(
                total_news_count=len(news_items),
                categories=categories,
                news_items=news_items,
                raw_transcript=transcript
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
