# Qwen2.5-1.5B-Instruct API Service

Qwen2.5-1.5B-Instruct API servisi, metin üretimi ve sohbet için Docker tabanlı bir servistir.

## Özellikler

- FastAPI tabanlı REST API
- Docker ve Docker Compose desteği
- GPU desteği (CUDA 11.8)
- Transformers AutoModelForCausalLM ile model yükleme
- Chat ve text generation endpoints
- Async request handling
- apply_chat_template desteği
- 32K context length ve 8K generation support

## Model Özellikleri

- **Model**: Qwen2.5-1.5B-Instruct
- **Parametreler**: 1.54B (1.31B non-embedding)
- **Katmanlar**: 28
- **Attention Heads**: 12 (Q), 2 (KV) - GQA
- **Context Length**: 32,768 tokens
- **Generation**: 8,192 tokens
- **Diller**: 29+ dil desteği

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

# Servisi başlat
python -m uvicorn api.main:app --host 0.0.0.0 --port 8001
```

## API Kullanımı

### Health Check

```bash
curl http://localhost:8001/health
```

### Chat Completion (JSON)

```bash
curl -X POST "http://localhost:8001/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Who are you?"}
    ],
    "max_new_tokens": 512,
    "temperature": 0.6,
    "top_p": 0.9
  }'
```

### Simple Chat (Form Data)

```bash
curl -X POST "http://localhost:8001/chat/simple" \
  -F "message=Who are you?" \
  -F "system_prompt=You are a helpful assistant." \
  -F "max_new_tokens=512" \
  -F "temperature=0.6"
```

### Text Generation

```bash
curl -X POST "http://localhost:8001/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time",
    "max_new_tokens": 512,
    "temperature": 0.6,
    "top_p": 0.9
  }'
```

## API Endpoints

### `GET /`
Ana sayfa ve servis bilgisi

### `GET /health`
Sağlık kontrolü

### `POST /chat`
Chat completion endpoint (JSON)
- `messages`: Mesaj listesi (role: system/user/assistant, content: mesaj)
- `system_prompt`: Sistem prompt'u (opsiyonel)
- `max_new_tokens`: Maksimum token sayısı (varsayılan: 512)
- `temperature`: Sampling temperature (varsayılan: 0.6)
- `top_p`: Top-p sampling (varsayılan: 0.9)
- `do_sample`: Sampling kullan (varsayılan: true)

### `POST /chat/simple`
Basit chat endpoint (form data)
- `message`: Kullanıcı mesajı
- `system_prompt`: Sistem prompt'u (opsiyonel)
- `max_new_tokens`: Maksimum token sayısı (varsayılan: 512)
- `temperature`: Sampling temperature (varsayılan: 0.6)
- `top_p`: Top-p sampling (varsayılan: 0.9)

### `POST /generate`
Text generation endpoint
- `prompt`: Başlangıç metni
- `max_new_tokens`: Maksimum token sayısı (varsayılan: 512)
- `temperature`: Sampling temperature (varsayılan: 0.6)
- `top_p`: Top-p sampling (varsayılan: 0.9)
- `do_sample`: Sampling kullan (varsayılan: true)

## Diğer Uygulamalardan Kullanım

### Python Örneği

```python
import requests

# Chat isteği
response = requests.post(
    "http://qwen2-5-1-5b:8001/chat",
    json={
        "messages": [
            {"role": "user", "content": "Who are you?"}
        ],
        "max_new_tokens": 512
    }
)
result = response.json()
print(result["response"])

# Basit chat
response = requests.post(
    "http://qwen2-5-1-5b:8001/chat/simple",
    data={
        "message": "Who are you?",
        "max_new_tokens": 512
    }
)
print(response.json()["response"])
```

### Docker Network

Servis `app-center-network` adlı bir Docker network'e bağlanır. Diğer uygulamalardan erişim için:

```python
# Docker network içinden
url = "http://qwen2-5-1-5b:8001/chat"

# Host'tan
url = "http://localhost:8001/chat"
```

## Yapılandırma

Environment variables ile yapılandırma:

- `MODEL_PATH`: Model yolu (varsayılan: `Qwen/Qwen2.5-1.5B-Instruct`)
- `CUDA_VISIBLE_DEVICES`: CUDA device (varsayılan: `0`)
- `API_HOST`: API host (varsayılan: `0.0.0.0`)
- `API_PORT`: API port (varsayılan: `8001`)

## VRAM Kullanımı

Qwen2.5-1.5B-Instruct modeli yaklaşık **3-4 GB VRAM** kullanır. RTX A5000 24GB VRAM'de rahatlıkla çalışır.

İki model (DeepSeekOCR + Qwen2.5-1.5B) birlikte çalışırken:
- DeepSeekOCR: ~12 GB (gpu_memory_utilization=0.50)
- Qwen2.5-1.5B: ~4 GB
- Toplam: ~16 GB (tek GPU'da rahatlıkla çalışır!)

## Sorun Giderme

### GPU Erişimi

```bash
# GPU'nun görünür olduğundan emin olun
nvidia-smi

# Docker'ın GPU'ya erişebildiğini kontrol edin
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Model İndirme

Model ilk çalıştırmada otomatik olarak HuggingFace'den indirilir. İndirme süreci uzun sürebilir (~3 GB).

### Transformers Versiyonu

Qwen2.5 için transformers>=4.37.0 gereklidir. Daha eski versiyonlarda `KeyError: 'qwen2'` hatası alabilirsiniz.

### Bellek Sorunları

VRAM yetersizse:
- Model quantization kullanın (4-bit, 8-bit)
- Max tokens'ı azaltın
- Batch size'ı azaltın

## Lisans

Qwen2.5 modeli Apache 2.0 lisansı altında lisanslanmıştır.
