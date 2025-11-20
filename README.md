# MTM App Center

İflas/İcra ilanı veri çıkarma sistemi. DeepSeekOCR ve Qwen2.5-1.5B-Instruct modellerini kullanarak gazete ilanlarından yapılandırılmış veri çıkarır.

## Proje Yapısı

```
app-center/
├── models/
│   ├── DeepSeekOCR/          # OCR servisi (Port 8000)
│   └── qwen2-5-1-5b/         # LLM servisi (Port 8001)
├── dataparser/                # Veri çıkarma pipeline'ı
├── docker-compose.yml         # Ana Docker Compose dosyası
└── README.md
```

## Hızlı Başlangıç

### 1. Gereksinimler

- Docker ve Docker Compose
- NVIDIA Docker runtime (GPU desteği için)
- NVIDIA GPU (RTX A5000 24GB önerilir)

### 2. Network Oluşturma

```bash
# Network'ü oluştur (eğer yoksa)
docker network create app-center-network
```

### 3. Servisleri Başlatma

```bash
# Tüm servisleri birlikte başlat
docker-compose up -d

# Logları görüntüle
docker-compose logs -f

# Belirli bir servisi başlat
docker-compose up -d deepseek-ocr
docker-compose up -d qwen2-5-1-5b
```

### 4. Servis Durumunu Kontrol Etme

```bash
# Tüm servislerin durumu
docker-compose ps

# Health check
curl http://localhost:8000/health  # DeepSeekOCR
curl http://localhost:8001/health  # Qwen2.5
```

## Servisler

### DeepSeekOCR (Port 8000)

Görüntülerden metin çıkarma servisi.

**API Endpoints:**
- `GET /health` - Health check
- `POST /ocr` - OCR işlemi

**Kullanım:**
```bash
curl -X POST "http://localhost:8000/ocr" \
  -F "file=@image.jpg" \
  -F "prompt=<image>\nFree OCR."
```

### Qwen2.5-1.5B-Instruct (Port 8001)

Metin analizi ve yapılandırılmış veri çıkarma servisi.

**API Endpoints:**
- `GET /health` - Health check
- `POST /chat` - Chat completion
- `POST /chat/simple` - Basit chat
- `POST /generate` - Text generation

**Kullanım:**
```bash
curl -X POST "http://localhost:8001/chat/simple" \
  -F "message=Who are you?"
```

### Data Parser Pipeline

İflas/İcra ilanı veri çıkarma pipeline'ı.

**Kullanım:**
```python
from dataparser.iflas_pipeline import process_iflas_ilan
import json

result = process_iflas_ilan("ilan_gorseli.jpg")
print(json.dumps(result, ensure_ascii=False, indent=2))
```

## Docker Network

Tüm servisler `app-center-network` adlı Docker network'ünde çalışır. Servisler birbirleriyle service isimleriyle iletişim kurar:

- `http://deepseek-ocr:8000` - DeepSeekOCR API
- `http://qwen2-5-1-5b:8001` - Qwen2.5 API

## Yapılandırma

### Environment Variables

`.env` dosyası oluşturarak yapılandırma yapabilirsiniz:

```bash
cp .env.example .env
# .env dosyasını düzenle
```

### Model Yolları

- `DEEPSEEK_MODEL_PATH`: DeepSeekOCR model yolu (varsayılan: `deepseek-ai/DeepSeek-OCR`)
- `QWEN_MODEL_PATH`: Qwen2.5 model yolu (varsayılan: `Qwen/Qwen2.5-1.5B-Instruct`)

### API URL'leri

Pipeline için API URL'leri environment variable'larla ayarlanabilir:

```bash
export DEEPSEEK_OCR_URL=http://deepseek-ocr:8000
export QWEN_API_URL=http://qwen2-5-1-5b:8001
```

## VRAM Kullanımı

- **DeepSeekOCR**: ~12 GB (gpu_memory_utilization=0.50)
- **Qwen2.5-1.5B**: ~4 GB
- **Toplam**: ~16 GB (RTX A5000 24GB'de rahatlıkla çalışır)

## Sorun Giderme

### Network Oluşturma

```bash
# Network'ü kontrol et
docker network ls | grep app-center-network

# Yoksa oluştur
docker network create app-center-network
```

### GPU Kontrolü

```bash
# GPU görünür mü?
nvidia-smi

# Docker GPU erişimi
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Servis Logları

```bash
# Tüm servislerin logları
docker-compose logs -f

# Belirli bir servisin logları
docker-compose logs -f deepseek-ocr
docker-compose logs -f qwen2-5-1-5b
```

### Servisleri Yeniden Başlatma

```bash
# Tüm servisleri yeniden başlat
docker-compose restart

# Belirli bir servisi yeniden başlat
docker-compose restart deepseek-ocr
```

### Servisleri Durdurma

```bash
# Tüm servisleri durdur
docker-compose down

# Servisleri durdur ama network'ü bırak
docker-compose stop
```

## Geliştirme

### Servisleri Ayrı Ayrı Başlatma

Her servis kendi dizininde bağımsız olarak da başlatılabilir:

```bash
# DeepSeekOCR
cd models/DeepSeekOCR
docker-compose up -d

# Qwen2.5
cd models/qwen2-5-1-5b
docker-compose up -d
```

### Model İndirme

Modeller ilk çalıştırmada otomatik olarak HuggingFace'den indirilir:
- DeepSeekOCR: ~8-10 GB
- Qwen2.5-1.5B: ~3 GB

## Lisans

- DeepSeekOCR: Orijinal lisans geçerlidir
- Qwen2.5: Apache 2.0

