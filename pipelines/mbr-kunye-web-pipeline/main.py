from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import openai
import os
import json
from io import BytesIO
import pandas as pd
from bs4 import BeautifulSoup
import time
import asyncio
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

app = FastAPI(title="MTM MBR Künye Web Pipeline", version="1.0.0")

# Configuration
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

class BatchKunyeWebResult(BaseModel):
    row: int
    yayin_adi: str
    link: str
    status: str  # 'success', 'failed'
    data: Optional[KunyeResult] = None
    raw_html_text: Optional[str] = None
    error: Optional[str] = None

class BatchProcessingSummary(BaseModel):
    total: int
    processed: int
    successful: int
    failed: int
    results: List[BatchKunyeWebResult]

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
    return {"status": "running", "service": "mbr-kunye-web-pipeline"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_kunye_prompt(html_text: str) -> str:
    """
    Creates prompt for extracting künye information from HTML text.
    Same structure as mbr-kunye-pipeline but adapted for web content.
    """
    return f"""Sen gazete ve dergi künyeleri konusunda uzman bir yapay zekasın.
Aşağıdaki metin bir web sayfasından alınan künye bilgisini içermektedir. Metin İngilizce veya bozuk olabilir, sen Türkçe olarak yanıtla.

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

**WEB SAYFASINDAKİ METİN:**
{html_text}

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

async def fetch_page_content_with_playwright(url: str) -> Optional[str]:
    """
    Fetches web page content using Playwright for JavaScript rendering support.
    Extracts visible text from the page after JavaScript execution.
    
    Args:
        url: Web page URL
        
    Returns:
        Extracted text content or None if fetch fails
    """
    try:
        print(f"[DEBUG] Fetching page with Playwright: {url}")
        
        async with async_playwright() as p:
            # Launch browser in headless mode
            browser = await p.chromium.launch(headless=True)
            
            # Create new page with realistic user agent
            page = await browser.new_page(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            try:
                # Navigate to page with timeout
                await page.goto(url, wait_until='networkidle', timeout=30000)
                
                # Wait a bit for any lazy-loaded content
                await page.wait_for_timeout(2000)
                
                # Get page content
                html_content = await page.content()
                
                # Parse with BeautifulSoup to extract text
                soup = BeautifulSoup(html_content, 'html.parser')
                
                # Remove script and style elements
                for script in soup(["script", "style", "noscript"]):
                    script.decompose()
                
                # Get text
                text = soup.get_text(separator='\n', strip=True)
                
                # Clean up multiple newlines
                lines = [line.strip() for line in text.splitlines() if line.strip()]
                clean_text = '\n'.join(lines)
                
                await browser.close()
                
                if len(clean_text) < 50:
                    print(f"[WARNING] Extracted text too short: {len(clean_text)} chars")
                    return None
                
                print(f"[DEBUG] Successfully extracted {len(clean_text)} characters from {url}")
                return clean_text
                
            except PlaywrightTimeoutError:
                print(f"[ERROR] Timeout loading page: {url}")
                await browser.close()
                return None
            except Exception as e:
                print(f"[ERROR] Error during page interaction: {e}")
                await browser.close()
                return None
                
    except Exception as e:
        print(f"[ERROR] Playwright error for {url}: {e}")
        return None

def results_to_excel(results: List[BatchKunyeWebResult]) -> bytes:
    """
    Converts batch results to Excel file bytes.
    
    Args:
        results: List of batch results
        
    Returns:
        Excel file as bytes
    """
    # Prepare data for Excel
    excel_data = []
    
    for result in results:
        if result.status == "success" and result.data:
            # Flatten künye data
            base_row = {
                "Satır": result.row,
                "Yayın Adı": result.yayin_adi,
                "Link": result.link,
                "Durum": "Başarılı",
                "Yayın Grubu": result.data.yayin_grubu,
                "Adres": result.data.adres,
                "Telefon": result.data.telefon,
                "Faks": result.data.faks,
                "Email": result.data.email,
                "Web Sitesi": result.data.web_sitesi,
                "Notlar": result.data.notlar,
            }
            
            # Add persons as concatenated string
            if result.data.kisiler:
                kisiler_str = "; ".join([
                    f"{p.ad_soyad} ({p.gorev})" 
                    for p in result.data.kisiler
                ])
                base_row["Kişiler"] = kisiler_str
            else:
                base_row["Kişiler"] = None
                
            excel_data.append(base_row)
        else:
            # Failed row
            excel_data.append({
                "Satır": result.row,
                "Yayın Adı": result.yayin_adi,
                "Link": result.link,
                "Durum": "Başarısız",
                "Hata": result.error,
                "Yayın Grubu": None,
                "Adres": None,
                "Telefon": None,
                "Faks": None,
                "Email": None,
                "Web Sitesi": None,
                "Notlar": None,
                "Kişiler": None,
            })
    
    # Create DataFrame
    df = pd.DataFrame(excel_data)
    
    # Write to Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Künye Sonuçları', index=False)
    
    output.seek(0)
    return output.getvalue()

@app.post("/api/v1/pipelines/mbr-kunye-web-single")
async def process_single_link(
    link: str = Form(...),
    yayin_adi: Optional[str] = Form(None),
    openai_api_key: Optional[str] = Form(None),
):
    """
    Processes a single künye page from web link.
    
    Args:
        link: Web URL of künye page
        yayin_adi: Optional publication name
        openai_api_key: OpenAI API Key
        
    Returns:
        KunyeResult with extracted data
    """
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli."
        )
    
    try:
        # Step 1: Fetch web page
        print(f"[DEBUG] Processing single link: {link}")
        html_text = await fetch_page_content_with_playwright(link)
        
        if not html_text:
            raise HTTPException(
                status_code=400,
                detail="Web sayfası alınamadı. Lütfen geçerli bir URL girin."
            )
        
        # Step 2: OpenAI extraction
        print(f"[DEBUG] Extracting data with OpenAI...")
        client = openai.OpenAI(api_key=openai_api_key)
        prompt = create_kunye_prompt(html_text)
        
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
        
        result = {
            "yayin_adi": yayin_adi or extracted_data.get("yayin_adi"),
            "link": link,
            "status": "success",
            "data": extracted_data,
            "raw_html_text": html_text[:500]  # First 500 chars
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error processing link: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"İşlem hatası: {str(e)}"
        )

@app.post("/api/v1/pipelines/mbr-kunye-web-batch-stream")
async def process_mbr_kunye_web_batch_stream(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    yayin_column: str = Form("A"),
    link_column: str = Form("B"),
):
    """
    Processes batch with Server-Sent Events for real-time progress updates.
    Fetches künye pages from web links using Playwright.
    """
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
            
            # Get column indices
            yayin_col_idx = ord(yayin_column.upper()) - 65 if yayin_column.isalpha() else 0
            link_col_idx = ord(link_column.upper()) - 65 if link_column.isalpha() else 1
            
            total = len(df)
            
            # Send initial status
            yield f"data: {json.dumps({'type': 'init', 'total': total})}\n\n"
            
            for idx, row in df.iterrows():
                # Get Yayın and Link
                try:
                    yayin_adi = str(row.iloc[yayin_col_idx]).strip()
                    link = str(row.iloc[link_col_idx]).strip()
                    
                    if pd.isna(row.iloc[yayin_col_idx]) or not yayin_adi:
                        continue
                    if pd.isna(row.iloc[link_col_idx]) or not link:
                        continue
                except:
                    continue
                
                row_result = BatchKunyeWebResult(
                    row=idx + 2,
                    yayin_adi=yayin_adi,
                    link=link,
                    status="processing"
                )
                
                try:
                    # Step 1: Fetch web page
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'yayin': yayin_adi, 'step': 'fetch', 'message': 'Web sayfası alınıyor...'})}\n\n"
                    
                    html_text = await fetch_page_content_with_playwright(link)
                    
                    if not html_text:
                        row_result.status = "failed"
                        row_result.error = "Web sayfası alınamadı"
                        failed += 1
                        results.append(row_result)
                        yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'yayin': yayin_adi, 'message': 'Web sayfası alınamadı'})}\n\n"
                        continue
                    
                    row_result.raw_html_text = html_text[:1000]  # Store first 1000 chars
                    
                    # Step 2: OpenAI extraction
                    yield f"data: {json.dumps({'type': 'progress', 'row': idx+1, 'total': total, 'yayin': yayin_adi, 'step': 'ai', 'message': 'Yapay zeka ile veri çıkarımı yapılıyor...'})}\n\n"
                    
                    client = openai.OpenAI(api_key=openai_api_key)
                    prompt = create_kunye_prompt(html_text)
                    
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
                    yield f"data: {json.dumps({'type': 'success', 'row': idx+1, 'total': total, 'yayin': yayin_adi, 'message': 'Başarıyla tamamlandı'})}\n\n"
                    
                    # Rate limiting
                    await asyncio.sleep(0.3)
                    
                except Exception as e:
                    print(f"[ERROR] Error processing {yayin_adi}: {e}")
                    row_result.status = "failed"
                    row_result.error = str(e)
                    failed += 1
                    results.append(row_result)
                    yield f"data: {json.dumps({'type': 'error', 'row': idx+1, 'total': total, 'yayin': yayin_adi, 'message': str(e)})}\n\n"
            
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

@app.post("/api/v1/pipelines/mbr-kunye-web-batch", response_model=BatchProcessingSummary)
async def process_mbr_kunye_web_batch(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    yayin_column: str = Form("A"),
    link_column: str = Form("B"),
):
    """
    Processes batch künye extraction from web links.
    Returns complete results as JSON.
    """
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
        
        # Get column indices
        yayin_col_idx = ord(yayin_column.upper()) - 65 if yayin_column.isalpha() else 0
        link_col_idx = ord(link_column.upper()) - 65 if link_column.isalpha() else 1
        
        total = len(df)
        print(f"Processing {total} rows from Excel...")
        
        for idx, row in df.iterrows():
            # Get Yayın and Link
            try:
                yayin_adi = str(row.iloc[yayin_col_idx]).strip()
                link = str(row.iloc[link_col_idx]).strip()
                
                if pd.isna(row.iloc[yayin_col_idx]) or not yayin_adi:
                    continue
                if pd.isna(row.iloc[link_col_idx]) or not link:
                    continue
            except:
                continue
            
            row_result = BatchKunyeWebResult(
                row=idx + 2,
                yayin_adi=yayin_adi,
                link=link,
                status="processing"
            )
            
            try:
                # 1. Fetch web page
                print(f"[{idx+1}/{total}] Fetching {yayin_adi} from {link}...")
                html_text = await fetch_page_content_with_playwright(link)
                
                if not html_text:
                    row_result.status = "failed"
                    row_result.error = "Web sayfası alınamadı"
                    failed += 1
                    results.append(row_result)
                    continue
                
                row_result.raw_html_text = html_text[:1000]
                
                # 2. OpenAI Extraction
                print(f"[{idx+1}/{total}] Extracting data with OpenAI...")
                client = openai.OpenAI(api_key=openai_api_key)
                prompt = create_kunye_prompt(html_text)
                
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
                print(f"[ERROR] Error processing {yayin_adi}: {e}")
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

@app.post("/api/v1/pipelines/mbr-kunye-web-batch-excel")
async def process_mbr_kunye_web_batch_excel(
    file: UploadFile = File(...),
    openai_api_key: Optional[str] = Form(None),
    yayin_column: str = Form("A"),
    link_column: str = Form("B"),
):
    """
    Processes batch and returns results as downloadable Excel file.
    """
    # Validate API key
    if not openai_api_key or not openai_api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="OpenAI API Key gerekli."
        )
    
    results = []
    total = 0
    
    try:
        # Read Excel file
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # Get column indices
        yayin_col_idx = ord(yayin_column.upper()) - 65 if yayin_column.isalpha() else 0
        link_col_idx = ord(link_column.upper()) - 65 if link_column.isalpha() else 1
        
        total = len(df)
        print(f"Processing {total} rows for Excel output...")
        
        for idx, row in df.iterrows():
            try:
                yayin_adi = str(row.iloc[yayin_col_idx]).strip()
                link = str(row.iloc[link_col_idx]).strip()
                
                if pd.isna(row.iloc[yayin_col_idx]) or not yayin_adi:
                    continue
                if pd.isna(row.iloc[link_col_idx]) or not link:
                    continue
            except:
                continue
            
            row_result = BatchKunyeWebResult(
                row=idx + 2,
                yayin_adi=yayin_adi,
                link=link,
                status="processing"
            )
            
            try:
                # Fetch and process
                html_text = await fetch_page_content_with_playwright(link)
                
                if not html_text:
                    row_result.status = "failed"
                    row_result.error = "Web sayfası alınamadı"
                    results.append(row_result)
                    continue
                
                # OpenAI extraction
                client = openai.OpenAI(api_key=openai_api_key)
                prompt = create_kunye_prompt(html_text)
                
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
                results.append(row_result)
                
                # Rate limit
                if idx < total - 1:
                    time.sleep(0.5)
                
            except Exception as e:
                print(f"[ERROR] Error processing {yayin_adi}: {e}")
                row_result.status = "failed"
                row_result.error = str(e)
                results.append(row_result)
        
        # Convert to Excel
        excel_bytes = results_to_excel(results)
        
        # Return as downloadable file
        return StreamingResponse(
            BytesIO(excel_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=kunye_sonuclari.xlsx"
            }
        )
        
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=400, detail=f"Hata: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8007, reload=False)
