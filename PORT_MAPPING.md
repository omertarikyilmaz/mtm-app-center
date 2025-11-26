# Port ve Servis İsim Reorganizasyonu

Port çakışması problemi çözüldü ve tüm servisler sistematik bir yapıya kavuşturuldu.

## Yeni Port Yapısı

### Frontend
- **Port 80** - Web UI (React + Nginx)

### API Servisleri (8001-8010)
| Servis | Port | Açıklama |
|--------|------|----------|
| `deepseek-ocr-api` | 8001 | DeepSeek OCR API (FastAPI) |
| `hunyuan-ocr-api` | 8002 | Hunyuan OCR API (FastAPI) |
| `iflas-pipeline-api` | 8003 | İflas OCR Pipeline (OpenAI + OCR) |
| `local-llm-api` | 8004 | Local Turkish-Gemma LLM (DISABLED) |

### vLLM Model Servisleri (8101-8110)
| Servis | Port | Açıklama |
|--------|------|----------|
| `deepseek-ocr-vllm` | 8101 | DeepSeek OCR Model Server |
| `hunyuan-ocr-vllm` | 8102 | Hunyuan OCR Model Server |

---

## Servis İsimlerindeki Değişiklikler

### Eski → Yeni Mapping

| Eski İsim | Yeni İsim | Değişiklik Sebebi |
|-----------|-----------|-------------------|
| `vllm` | `deepseek-ocr-vllm` | Daha açıklayıcı isim |
| `backend` | `deepseek-ocr-api` | Hangi OCR servisi olduğu belli |
| `hunyuan-vllm` | `hunyuan-ocr-vllm` | Tutarlılık için |
| `hunyuan-backend` | `hunyuan-ocr-api` | Hangi OCR servisi olduğu belli |
| `iflas-pipeline` | `iflas-pipeline-api` | API servis olduğu belli |
| `local-llm-service` | `local-llm-api` | Tutarlılık için |

---

## Güncellenen Dosyalar

### 1. docker-compose.yml
- Tüm servis isimleri güncellendi
- Port mapping'ler sistematik hale getirildi
- İç network'te kullanılan portlar da güncellendi

### 2. Backend Servisleri
- `hunyuan-ocr-service/main.py`: Port 8002
- `hunyuan-ocr-service/Dockerfile`: Port 8002
- `hunyuan-ocr-service/Dockerfile.vllm`: Port 8102
- `pipelines/openai-iflas-pipeline/main.py`: Port 8003

### 3. Frontend
- `frontend/nginx.conf`: Tüm proxy_pass direktifleri yeni servis isimlerine göre güncellendi

---

## Deployment

### Mevcut Container'ları Durdur ve Temizle

```bash
cd /home/ower/Projects/mtm/mtm-app-center

# Tüm container'ları durdur ve sil
docker compose down

# Orphan container'ları da temizle
docker compose down --remove-orphans
```

### Yeniden Build ve Başlat

```bash
# Tüm servisleri yeniden build et
docker compose build

# Servisleri başlat
docker compose up -d

# Logları takip et
docker compose logs -f
```

### Health Check

Her servisin sağlıklı çalıştığını kontrol edin:

```bash
# Frontend
curl http://localhost/

# DeepSeek OCR API
curl http://localhost:8001/health

# Hunyuan OCR API
curl http://localhost:8002/health

# İflas Pipeline API
curl http://localhost:8003/health
```

---

## API Endpoint Değişiklikleri

**ÖNEMLİ:** Frontend nginx üzerinden yönlendirme yapıyor, bu yüzden dış dünyaya açık endpoint'ler değişmedi:

- `http://localhost/api/v1/ocr` → DeepSeek OCR
- `http://localhost/api/v1/hunyuan-ocr` → Hunyuan OCR
- `http://localhost/api/v1/pipelines/iflas-ocr` → İflas Pipeline

Container içi servisler arası iletişim yeni servis isimleri ve portları kullanıyor.

---

## Sorun Giderme

### Port Çakışması Kontrolü

Eğer hala port çakışması yaşıyorsanız:

```bash
# Hangi portların kullanıldığını kontrol edin
netstat -tuln | grep LISTEN | grep -E ":(80|8001|8002|8003|8101|8102)"

# Veya lsof ile
lsof -i :8001
lsof -i :8002
lsof -i :8003
lsof -i :8101
lsof -i :8102
```

### Container İsimleri

Docker Compose otomatik olarak container isimlerine prefix ekler:
- `mtm-app-center-deepseek-ocr-vllm-1`
- `mtm-app-center-deepseek-ocr-api-1`
- `mtm-app-center-hunyuan-ocr-vllm-1`
- `mtm-app-center-hunyuan-ocr-api-1`
- `mtm-app-center-iflas-pipeline-api-1`
- `mtm-app-center-frontend-1`

---

## Yeni Yapının Avantajları

✅ **Sistematik Port Yapısı:** API servisleri 8001-8010, vLLM servisleri 8101+  
✅ **Açıklayıcı İsimler:** Her servisin ne olduğu isimden anlaşılıyor  
✅ **Port Çakışması Yok:** Her servis kendi unique portuna sahip  
✅ **Kolay Genişletilebilir:** Yeni OCR veya LLM servisi eklemek kolay  
✅ **Tutarlı Naming Convention:** Tüm servisler aynı isimlendirme kuralını takip ediyor
