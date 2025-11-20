"""
İflas/İcra İlanı Veri Çıkarma Pipeline'ı

Bu pipeline:
1. Görsel alır (dosya veya base64)
2. DeepSeekOCR ile görseli okur
3. Qwen2.5-1.5B-Instruct ile OCR çıktısından yapılandırılmış veri çıkarır
4. JSON formatında sonuç döndürür
"""
import os
import json
import csv
import base64
from typing import Optional, Dict, Union, List
from pathlib import Path
import requests
from PIL import Image
import io


# API URL'leri (environment variable'lardan veya varsayılan değerler)
DEEPSEEK_OCR_URL = os.getenv("DEEPSEEK_OCR_URL", "http://deepseek-ocr:8000")
QWEN_API_URL = os.getenv("QWEN_API_URL", "http://qwen2-5-1-5b:8001")


def process_image_to_ocr(image_input: Union[str, bytes, Path, Image.Image]) -> str:
    """
    Görseli DeepSeekOCR ile okur
    
    Args:
        image_input: Görsel dosya yolu, bytes, base64 string, Path veya PIL Image
    
    Returns:
        OCR çıktısı (metin)
    """
    # Görseli bytes'a çevir
    if isinstance(image_input, str):
        # Base64 string mi?
        if image_input.startswith('data:image') or len(image_input) > 100:
            try:
                # Base64 decode
                if ',' in image_input:
                    image_input = image_input.split(',')[1]
                image_data = base64.b64decode(image_input)
            except:
                # Dosya yolu olabilir
                with open(image_input, 'rb') as f:
                    image_data = f.read()
        else:
            # Dosya yolu
            with open(image_input, 'rb') as f:
                image_data = f.read()
    elif isinstance(image_input, Path):
        with open(image_input, 'rb') as f:
            image_data = f.read()
    elif isinstance(image_input, Image.Image):
        # PIL Image'i bytes'a çevir
        buffer = io.BytesIO()
        image_input.save(buffer, format='PNG')
        image_data = buffer.getvalue()
    else:
        # Zaten bytes
        image_data = image_input
    
    # DeepSeekOCR API'ye gönder
    ocr_url = f"{DEEPSEEK_OCR_URL}/ocr"
    
    # Base64 encode
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    # OCR prompt
    ocr_prompt = "<image>\nFree OCR."
    
    try:
        response = requests.post(
            ocr_url,
            data={
                "image_base64": image_base64,
                "prompt": ocr_prompt
            },
            timeout=300  # 5 dakika timeout
        )
        response.raise_for_status()
        result = response.json()
        return result.get("text", "")
    except requests.exceptions.RequestException as e:
        raise Exception(f"DeepSeekOCR API hatası: {str(e)}")


def extract_structured_data(ocr_text: str) -> Dict:
    """
    OCR çıktısından yapılandırılmış veri çıkarır (Qwen2.5 kullanarak)
    
    Args:
        ocr_text: OCR ile çıkarılmış metin
    
    Returns:
        Yapılandırılmış veri (JSON dict)
    """
    # Qwen2.5 için prompt
    system_prompt = """Sen bir gazete ilanı analiz uzmanısın. İcra/iflas ilanlarından yapılandırılmış veri çıkarırsın."""
    
    user_prompt = f"""Aşağıdaki metin bir gazete icra/iflas ilanıdır. Bu metinden belirtilen alanları çıkar ve geçerli bir JSON döndür:

Alanlar:

- ad_soyad_unvan: İflas/İcra konusu olan kişi ya da kurumun adı/unvanı.

- tckn: Kişi ise 11 haneli T.C. Kimlik Numarası. Yoksa "" bırak.

- vkn: Kurum ise 10 haneli vergi numarası. Yoksa "" bırak.

- adres: İlgili kişi/kurumun adresi.

- icra_iflas_mudurlugu: İlanda geçen icra dairesi, icra müdürlüğü veya asliye ticaret mahkemesi adı.

- dosya_yili: Dosya numarasındaki yıl (örn: "2024/123 E." → "2024").

- ilan_turu: İlanın türü (örn: "iflas", "icra satış ilanı", "konkordato", "tasfiye" vb.). Metinde açık yazmıyorsa, içerikten tahmin et; emin değilsen "" bırak.

- ilan_tarihi: İlanın yayınlandığı tarih. Bulamazsan "" bırak.

- davacilar: Varsa davacıların isimlerinden oluşan liste (örn: ["X BANKASI A.Ş.", "Y BANKASI"]).

- kaynak: İlanın yer aldığı yayın ve sayfa (örn: "AKSAM/SYF5", "RESMİ GAZETE/SYF12"). Bulamazsan "" bırak.

Kurallar:

- Sadece geçerli bir JSON döndür.

- Anahtar isimlerini aynen kullan.

- Tarihleri mümkünse "YYYY-MM-DD" formatında yaz; emin değilsen metindeki haliyle bırak.

- TCKN 11 haneli, VKN 10 haneli rakamlardan oluşsun.

- Davacilar mutlaka bir liste olsun (boşsa []).

Metin:

{ocr_text}

"""
    
    # Qwen2.5 API'ye gönder
    qwen_url = f"{QWEN_API_URL}/chat"
    
    try:
        response = requests.post(
            qwen_url,
            json={
                "messages": [
                    {"role": "user", "content": user_prompt}
                ],
                "system_prompt": system_prompt,
                "max_new_tokens": 1024,
                "temperature": 0.1,  # Düşük temperature daha tutarlı sonuçlar için
                "top_p": 0.9
            },
            timeout=120  # 2 dakika timeout
        )
        response.raise_for_status()
        result = response.json()
        response_text = result.get("response", "")
        
        # JSON'u parse et
        # Response'ta JSON bloğu olabilir, extract et
        response_text = response_text.strip()
        
        # JSON bloğunu bul (```json ... ``` veya sadece { ... })
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            json_str = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            json_str = response_text[start:end].strip()
        elif response_text.startswith("{"):
            json_str = response_text
        else:
            # JSON bloğunu bul
            start = response_text.find("{")
            end = response_text.rfind("}") + 1
            if start >= 0 and end > start:
                json_str = response_text[start:end]
            else:
                raise ValueError("JSON bulunamadı")
        
        # Parse JSON
        data = json.loads(json_str)
        
        # Varsayılan değerleri kontrol et
        default_data = {
            "ad_soyad_unvan": "",
            "tckn": "",
            "vkn": "",
            "adres": "",
            "icra_iflas_mudurlugu": "",
            "dosya_yili": "",
            "ilan_turu": "",
            "ilan_tarihi": "",
            "davacilar": [],
            "kaynak": ""
        }
        
        # Eksik alanları doldur
        for key in default_data:
            if key not in data:
                data[key] = default_data[key]
        
        # Davacilar'ın liste olduğundan emin ol
        if not isinstance(data.get("davacilar"), list):
            data["davacilar"] = []
        
        return data
        
    except json.JSONDecodeError as e:
        raise Exception(f"JSON parse hatası: {str(e)}. Response: {response_text[:200]}")
    except requests.exceptions.RequestException as e:
        raise Exception(f"Qwen2.5 API hatası: {str(e)}")
    except Exception as e:
        raise Exception(f"Veri çıkarma hatası: {str(e)}")


def get_image_filename(image_input: Union[str, bytes, Path, Image.Image]) -> str:
    """
    Görsel dosya adını çıkarır
    
    Args:
        image_input: Görsel dosya yolu, bytes, base64 string, Path veya PIL Image
    
    Returns:
        Dosya adı veya "unknown"
    """
    if isinstance(image_input, str):
        # Dosya yolu mu?
        if os.path.exists(image_input) or '/' in image_input or '\\' in image_input:
            return os.path.basename(image_input)
        else:
            return "unknown"
    elif isinstance(image_input, Path):
        return image_input.name
    else:
        return "unknown"


def process_iflas_ilan(image_input: Union[str, bytes, Path, Image.Image], image_filename: Optional[str] = None) -> Dict:
    """
    İflas/İcra ilanı görselini işler ve yapılandırılmış veri döndürür
    
    Args:
        image_input: Görsel dosya yolu, bytes, base64 string, Path veya PIL Image
        image_filename: Görsel dosya adı (opsiyonel, otomatik çıkarılır)
    
    Returns:
        Yapılandırılmış veri (JSON dict) - 'gorsel_dosya_adi' alanı eklenir
    """
    # Dosya adını al
    if image_filename is None:
        image_filename = get_image_filename(image_input)
    
    # 1. OCR ile görseli oku
    print("Görsel OCR ile okunuyor...")
    ocr_text = process_image_to_ocr(image_input)
    
    if not ocr_text or not ocr_text.strip():
        raise Exception("OCR çıktısı boş")
    
    print(f"OCR tamamlandı. Metin uzunluğu: {len(ocr_text)} karakter")
    
    # 2. Yapılandırılmış veri çıkar
    print("Yapılandırılmış veri çıkarılıyor...")
    structured_data = extract_structured_data(ocr_text)
    
    # Görsel dosya adını ekle
    structured_data["gorsel_dosya_adi"] = image_filename
    
    print("İşlem tamamlandı!")
    
    return structured_data


def save_to_csv(data: Dict, csv_file: str, append: bool = False):
    """
    Veriyi CSV dosyasına kaydeder
    
    Args:
        data: Yapılandırılmış veri dict
        csv_file: CSV dosya yolu
        append: Mevcut dosyaya ekle (True) veya üzerine yaz (False)
    """
    # CSV kolonları
    fieldnames = [
        "gorsel_dosya_adi",
        "ad_soyad_unvan",
        "tckn",
        "vkn",
        "adres",
        "icra_iflas_mudurlugu",
        "dosya_yili",
        "ilan_turu",
        "ilan_tarihi",
        "davacilar",
        "kaynak"
    ]
    
    # Dosya var mı kontrol et
    file_exists = os.path.exists(csv_file) and append
    
    # Davacilar'ı string'e çevir (virgülle ayrılmış)
    csv_data = data.copy()
    if isinstance(csv_data.get("davacilar"), list):
        csv_data["davacilar"] = ", ".join(csv_data["davacilar"])
    else:
        csv_data["davacilar"] = ""
    
    # CSV yaz
    with open(csv_file, 'a' if append else 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        
        # Header yaz (sadece yeni dosya veya append=False ise)
        if not file_exists:
            writer.writeheader()
        
        # Veriyi yaz
        row = {field: csv_data.get(field, "") for field in fieldnames}
        writer.writerow(row)


def save_batch_to_csv(data_list: List[Dict], csv_file: str):
    """
    Birden fazla veriyi CSV dosyasına kaydeder
    
    Args:
        data_list: Yapılandırılmış veri dict listesi
        csv_file: CSV dosya yolu
    """
    if not data_list:
        return
    
    # CSV kolonları
    fieldnames = [
        "gorsel_dosya_adi",
        "ad_soyad_unvan",
        "tckn",
        "vkn",
        "adres",
        "icra_iflas_mudurlugu",
        "dosya_yili",
        "ilan_turu",
        "ilan_tarihi",
        "davacilar",
        "kaynak"
    ]
    
    # CSV yaz
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        
        for data in data_list:
            # Davacilar'ı string'e çevir
            csv_data = data.copy()
            if isinstance(csv_data.get("davacilar"), list):
                csv_data["davacilar"] = ", ".join(csv_data["davacilar"])
            else:
                csv_data["davacilar"] = ""
            
            row = {field: csv_data.get(field, "") for field in fieldnames}
            writer.writerow(row)


# CLI için main fonksiyonu
if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description="İflas/İcra ilanı veri çıkarma pipeline'ı")
    parser.add_argument("image", help="Görsel dosya yolu veya base64 string")
    parser.add_argument("-o", "--output", help="Çıktı JSON dosyası (opsiyonel)")
    parser.add_argument("-c", "--csv", help="Çıktı CSV dosyası (opsiyonel)")
    parser.add_argument("--append", action="store_true", help="CSV dosyasına ekle (mevcut dosyaya)")
    parser.add_argument("--ocr-url", help="DeepSeekOCR API URL", default=DEEPSEEK_OCR_URL)
    parser.add_argument("--qwen-url", help="Qwen2.5 API URL", default=QWEN_API_URL)
    
    args = parser.parse_args()
    
    # API URL'lerini güncelle
    if args.ocr_url:
        DEEPSEEK_OCR_URL = args.ocr_url
    if args.qwen_url:
        QWEN_API_URL = args.qwen_url
    
    try:
        # İşle
        result = process_iflas_ilan(args.image)
        
        # Çıktı
        if args.csv:
            save_to_csv(result, args.csv, append=args.append)
            print(f"Sonuç {args.csv} CSV dosyasına kaydedildi.")
        elif args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"Sonuç {args.output} dosyasına kaydedildi.")
        else:
            print(json.dumps(result, ensure_ascii=False, indent=2))
    
    except Exception as e:
        print(f"Hata: {str(e)}", file=sys.stderr)
        sys.exit(1)

