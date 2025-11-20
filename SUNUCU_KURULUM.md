# Sunucuda Kurulum Rehberi

## 1. Projeyi Sunucuya Kopyalama

```bash
# Sunucuya SSH ile bağlan
ssh user@sunucu-ip

# Proje dizinine git (veya oluştur)
cd /opt
sudo mkdir -p mtm
cd mtm

# GitHub'dan klonla
git clone git@github.com:omertarikyilmaz/mtm-app-center.git
cd mtm-app-center
```

**Alternatif:** Eğer SSH key yoksa:
```bash
git clone https://github.com/omertarikyilmaz/mtm-app-center.git
```

## 2. Gereksinimleri Kontrol Et

```bash
# Docker kontrolü
docker --version
docker-compose --version

# NVIDIA Docker kontrolü
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# GPU kontrolü
nvidia-smi

# Disk alanı kontrolü (en az 50GB boş alan)
df -h
```

## 3. HuggingFace Cache Dizini Oluştur

```bash
mkdir -p ~/.cache/huggingface
```

## 4. Servisleri Başlat

```bash
# Proje dizinine git
cd /opt/mtm/mtm-app-center

# Tüm servisleri build et ve başlat
docker-compose up -d --build

# Logları izle (modellerin indirildiğini görmek için)
docker-compose logs -f
```

**Not:** İlk çalıştırmada modeller indirilecek (~15-20 GB). Bu 10-30 dakika sürebilir.

## 5. Durum Kontrolü

```bash
# Servis durumu
docker-compose ps

# Health check
curl http://localhost:8000/health  # DeepSeekOCR
curl http://localhost:8001/health  # Qwen2.5
curl http://localhost:8080/health  # Frontend

# GPU kullanımı
watch -n 1 nvidia-smi
```

## 6. Frontend'e Erişim

```bash
# Local erişim
curl http://localhost:8080

# Network erişimi için firewall ayarları
sudo ufw allow 8080/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8001/tcp
```

Tarayıcıdan: `http://SUNUCU_IP:8080`

## 7. Servis Yönetimi

### Servisleri Durdurma
```bash
docker-compose down
```

### Servisleri Yeniden Başlatma
```bash
docker-compose restart
```

### Logları Görüntüleme
```bash
# Tüm loglar
docker-compose logs -f

# Belirli servis
docker-compose logs -f deepseek-ocr
docker-compose logs -f qwen2-5-1-5b
docker-compose logs -f frontend
```

### Servisleri Güncelleme
```bash
# Yeni kodları çek
git pull origin main

# Servisleri rebuild ve restart
docker-compose up -d --build
```

## 8. Sorun Giderme

### GPU Görünmüyor
```bash
# GPU kontrolü
nvidia-smi

# Docker GPU erişimi test
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Port Çakışması
```bash
# Port kullanımını kontrol et
sudo netstat -tulpn | grep -E '8000|8001|8080'

# Çakışan servisi durdur
sudo systemctl stop <service-name>
```

### Model İndirme Hatası
```bash
# HuggingFace cache'i temizle
rm -rf ~/.cache/huggingface/*

# Tekrar dene
docker-compose restart deepseek-ocr
docker-compose restart qwen2-5-1-5b
```

### Network Sorunu
```bash
# Network'ü kontrol et
docker network ls | grep app-center-network

# Yoksa oluştur
docker network create app-center-network
```

## 9. Production Önerileri

### Systemd Service (Opsiyonel)
```bash
# /etc/systemd/system/mtm-app-center.service
[Unit]
Description=MTM App Center
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/mtm/mtm-app-center
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable mtm-app-center
sudo systemctl start mtm-app-center
```

### Reverse Proxy (Nginx) - Opsiyonel
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 10. Hızlı Komutlar

```bash
# Tüm servisleri başlat
docker-compose up -d

# Servis durumu
docker-compose ps

# Logları izle
docker-compose logs -f

# Servisleri durdur
docker-compose down

# Servisleri yeniden başlat
docker-compose restart

# GPU kullanımı
watch -n 1 nvidia-smi
```

## Özet

1. ✅ Projeyi klonla: `git clone git@github.com:omertarikyilmaz/mtm-app-center.git`
2. ✅ Gereksinimleri kontrol et: Docker, NVIDIA Docker, GPU
3. ✅ Cache dizini oluştur: `mkdir -p ~/.cache/huggingface`
4. ✅ Servisleri başlat: `docker-compose up -d --build`
5. ✅ Durum kontrolü: `docker-compose ps` ve health check'ler
6. ✅ Frontend'e eriş: `http://SUNUCU_IP:8080`

**İlk kurulum süresi:** ~15-30 dakika (model indirme dahil)

