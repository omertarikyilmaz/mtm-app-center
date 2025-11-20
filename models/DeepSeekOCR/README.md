# DeepSeekOCR API Service

DeepSeekOCR API servisi, görüntülerden metin çıkarma (OCR) işlemleri için Docker tabanlı bir servistir.

## Özellikler

- FastAPI tabanlı REST API
- Docker ve Docker Compose desteği
- GPU desteği (CUDA 11.8)
- Batch işleme desteği
- Base64 ve dosya yükleme desteği

## Kurulum

### Docker ile Kurulum

1. Docker ve Docker Compose'un kurulu olduğundan emin olun
2. NVIDIA Docker runtime'ın kurulu olduğundan emin olun (GPU desteği için)

```bash
# Servisi başlat
docker-compose up -d

# Logları görüntüle
docker-compose logs -f
```

### Manuel Kurulum

```bash
# Gerekli paketleri yükle
pip install -r requirements.txt

# PyTorch ve vLLM'i CUDA desteği ile yükle
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu118
pip install vllm-0.8.5+cu118-cp312-cp312-linux_x86_64.whl
pip install flash-attn==2.7.3 --no-build-isolation

# Servisi başlat
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## API Kullanımı

### Health Check

```bash
curl http://localhost:8000/health
```

### OCR İşlemi (Dosya Yükleme)

```bash
curl -X POST "http://localhost:8000/ocr" \
  -F "file=@image.jpg" \
  -F "prompt=<image>\nFree OCR."
```

### OCR İşlemi (Base64)

```bash
curl -X POST "http://localhost:8000/ocr" \
  -F "image_base64=<base64_encoded_image>" \
  -F "prompt=<image>\nFree OCR."
```

### Batch İşleme

```bash
curl -X POST "http://localhost:8000/ocr/batch" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg" \
  -F "prompt=<image>\nFree OCR."
```

## API Endpoints

### `GET /`
Ana sayfa ve servis bilgisi

### `GET /health`
Sağlık kontrolü

### `POST /ocr`
Tek bir görüntü için OCR işlemi
- `file`: Yüklenecek görüntü dosyası (opsiyonel)
- `image_base64`: Base64 kodlanmış görüntü (opsiyonel)
- `prompt`: Özel prompt (varsayılan: `<image>\nFree OCR.`)

### `POST /ocr/batch`
Birden fazla görüntü için batch OCR işlemi
- `files`: Yüklenecek görüntü dosyaları (liste)
- `prompt`: Özel prompt (opsiyonel)

## Prompt Örnekleri

- **Genel OCR**: `<image>\nFree OCR.`
- **Belge Markdown**: `<image>\n<|grounding|>Convert the document to markdown.`
- **Görüntü OCR**: `<image>\n<|grounding|>OCR this image.`
- **Figür Ayrıştırma**: `<image>\nParse the figure.`
- **Genel Açıklama**: `<image>\nDescribe this image in detail.`

## Yapılandırma

Yapılandırma dosyası `config.py` içinde bulunur:

- `MODEL_PATH`: Model yolu (varsayılan: `deepseek-ai/DeepSeek-OCR`)
- `BASE_SIZE`: Temel görüntü boyutu (varsayılan: 1024)
- `IMAGE_SIZE`: Görüntü boyutu (varsayılan: 640)
- `CROP_MODE`: Kırpma modu (varsayılan: True)

## Docker Network

Servis `app-center-network` adlı bir Docker network'e bağlanır. Diğer uygulamalardan erişim için:

```python
import requests

response = requests.post(
    "http://deepseek-ocr:8000/ocr",
    files={"file": open("image.jpg", "rb")},
    data={"prompt": "<image>\nFree OCR."}
)
print(response.json())
```

## Sorun Giderme

### GPU Erişimi

```bash
# GPU'nun görünür olduğundan emin olun
nvidia-smi

# Docker'ın GPU'ya erişebildiğini kontrol edin
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Model İndirme

Model ilk çalıştırmada otomatik olarak HuggingFace'den indirilir. İndirme süreci uzun sürebilir.

### Bellek Sorunları

GPU belleği yetersizse `config.py` dosyasında:
- `MAX_CROPS` değerini azaltın (örn: 4)
- `MAX_CONCURRENCY` değerini azaltın
- `gpu_memory_utilization` değerini azaltın (api/main.py içinde)

## Lisans

DeepSeekOCR modeli için orijinal lisans geçerlidir.

