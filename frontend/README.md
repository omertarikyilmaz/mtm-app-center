# Frontend Service

MTM App Center için web arayüzü. Qwen Chat, DeepSeekOCR ve İflas Pipeline servislerine erişim sağlar.

## Özellikler

- 💬 **Qwen Chat**: Qwen2.5-1.5B modeli ile sohbet
- 📄 **DeepSeekOCR**: Görsellerden metin çıkarma
- 📋 **İflas Pipeline**: İflas/İcra ilanlarını işleme ve CSV çıktı

## Kurulum

### Docker ile

```bash
# Tüm servislerle birlikte
docker-compose up -d

# Sadece frontend
cd frontend
docker-compose up -d
```

### Manuel Kurulum

```bash
cd frontend
pip install -r requirements.txt
python app.py
```

## Kullanım

Frontend `http://localhost:8080` adresinde çalışır.

### Endpoints

- `GET /` - Ana sayfa (HTML)
- `GET /health` - Health check
- `POST /api/chat` - Qwen chat
- `POST /api/ocr` - DeepSeekOCR işleme
- `POST /api/iflas/process` - İflas pipeline (JSON)
- `POST /api/iflas/process-and-csv` - İflas pipeline (CSV)
- `POST /api/iflas/batch-process` - Toplu işleme (CSV)

## Yapılandırma

Environment variables:

- `DEEPSEEK_OCR_URL`: DeepSeekOCR API URL (varsayılan: `http://deepseek-ocr:8000`)
- `QWEN_API_URL`: Qwen2.5 API URL (varsayılan: `http://qwen2-5-1-5b:8001`)

## Özellikler

### Qwen Chat
- Sistem prompt desteği
- Temperature ve max tokens ayarları
- Chat geçmişi görüntüleme

### DeepSeekOCR
- Dosya yükleme veya drag & drop
- Özel prompt desteği
- OCR sonuç görüntüleme

### İflas Pipeline
- Tek görsel işleme
- Toplu görsel işleme
- JSON ve CSV çıktı
- Otomatik CSV indirme

## Hata Yönetimi

Frontend, tüm hataları kullanıcı dostu mesajlarla gösterir:
- API erişim hataları
- İşleme hataları
- Dosya yükleme hataları
- Servis durumu kontrolü

