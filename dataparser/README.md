MTM Data Parser App
DeepSeekOCR ve Qwen2.5-1.5B-Instruct kullanarak gazetelerin iflas/icra ilanlarını okur ve yapılandırılmış veri çıkarır.

## Kullanım Amaçları

### İflas/İcra İlanları

Pipeline, gazete ilanlarından aşağıdaki bilgileri çıkarır:

- **AD SOYAD / UNVAN**: İflas/İcra konusu olan kişi ya da kurum
- **TCKN**: Kişi ise TC no (11 haneli)
- **VKN**: Kurum ise vergi no (10 haneli)
- **ADRES**: Kurum ya da Kişi adresi
- **İCRA/İFLAS MÜDÜRLÜĞÜ**: İlandaki icra/iflas müdürlüğü adı
- **DOSYA YILI**: İlandaki dosya yılı
- **İLAN TÜRÜ**: İlanın türü (iflas, icra satış ilanı, konkordato, tasfiye vb.)
- **İLAN TARİHİ**: Yayınlandığı tarih
- **DAVACILAR**: Varsa davacı isimleri (liste)
- **KAYNAK**: İlanın yer aldığı yayın adı ve sayfa no (örn: AKSAM/SYF5)

## Kurulum

### Gereksinimler

```bash
pip install -r requirements.txt
```

### API Servisleri

Pipeline'ın çalışması için aşağıdaki servislerin çalışıyor olması gerekir:

1. **DeepSeekOCR API** (Port 8000)
   - `http://deepseek-ocr:8000` (Docker network içinden)
   - `http://localhost:8000` (Host'tan)

2. **Qwen2.5-1.5B-Instruct API** (Port 8001)
   - `http://qwen2-5-1-5b:8001` (Docker network içinden)
   - `http://localhost:8001` (Host'tan)

## Kullanım

### Python ile

```python
from iflas_pipeline import process_iflas_ilan, save_to_csv, save_batch_to_csv
import json

# Dosya yolu ile
result = process_iflas_ilan("ilan_gorseli.jpg")
print(json.dumps(result, ensure_ascii=False, indent=2))

# CSV'ye kaydet
save_to_csv(result, "output.csv", append=False)

# Birden fazla görseli işle ve CSV'ye kaydet
results = []
for image_path in ["ilan1.jpg", "ilan2.jpg", "ilan3.jpg"]:
    result = process_iflas_ilan(image_path)
    results.append(result)

save_batch_to_csv(results, "batch_output.csv")

# CSV'ye ekle (mevcut dosyaya)
save_to_csv(result, "output.csv", append=True)
```

### Komut Satırı ile

```bash
# Temel kullanım (JSON çıktı)
python iflas_pipeline.py ilan_gorseli.jpg

# JSON dosyasına kaydet
python iflas_pipeline.py ilan_gorseli.jpg -o output.json

# CSV dosyasına kaydet
python iflas_pipeline.py ilan_gorseli.jpg -c output.csv

# CSV dosyasına ekle (mevcut dosyaya)
python iflas_pipeline.py ilan_gorseli.jpg -c output.csv --append

# Özel API URL'leri
python iflas_pipeline.py ilan_gorseli.jpg \
  --ocr-url http://localhost:8000 \
  --qwen-url http://localhost:8001 \
  -c output.csv
```

## Çıktı Formatı

### JSON Formatı

Pipeline, aşağıdaki JSON formatında çıktı üretir:

```json
{
  "gorsel_dosya_adi": "ilan_gorseli.jpg",
  "ad_soyad_unvan": "ÖRNEK ŞİRKET A.Ş.",
  "tckn": "",
  "vkn": "1234567890",
  "adres": "Örnek Mahalle, Örnek Sokak No:1, İstanbul",
  "icra_iflas_mudurlugu": "İstanbul İcra Müdürlüğü",
  "dosya_yili": "2024",
  "ilan_turu": "icra satış ilanı",
  "ilan_tarihi": "2024-01-15",
  "davacilar": ["X BANKASI A.Ş.", "Y BANKASI"],
  "kaynak": "AKSAM/SYF5"
}
```

### CSV Formatı

CSV çıktısı aşağıdaki kolonlardan oluşur:

| gorsel_dosya_adi | ad_soyad_unvan | tckn | vkn | adres | icra_iflas_mudurlugu | dosya_yili | ilan_turu | ilan_tarihi | davacilar | kaynak |
|------------------|----------------|------|-----|-------|---------------------|------------|-----------|-------------|-----------|--------|
| ilan_gorseli.jpg | ÖRNEK ŞİRKET A.Ş. | | 1234567890 | Örnek Mahalle... | İstanbul İcra Müdürlüğü | 2024 | icra satış ilanı | 2024-01-15 | X BANKASI A.Ş., Y BANKASI | AKSAM/SYF5 |

**Not**: `davacilar` kolonu virgülle ayrılmış string olarak kaydedilir (örn: "X BANKASI A.Ş., Y BANKASI").

## Environment Variables

API URL'lerini environment variable'larla ayarlayabilirsiniz:

```bash
export DEEPSEEK_OCR_URL=http://deepseek-ocr:8000
export QWEN_API_URL=http://qwen2-5-1-5b:8001
```

## Örnekler

Detaylı örnekler için `example_usage.py` dosyasına bakın.

## Hata Yönetimi

Pipeline, aşağıdaki durumlarda hata fırlatır:

- OCR çıktısı boşsa
- API servisleri erişilemezse
- JSON parse hatası varsa
- Görsel okunamazsa

Hatalar açıklayıcı mesajlarla fırlatılır.
