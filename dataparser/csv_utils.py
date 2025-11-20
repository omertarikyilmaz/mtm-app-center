"""
CSV yardımcı fonksiyonları
"""
import csv
import os
from typing import Dict, List


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


def read_csv(csv_file: str) -> List[Dict]:
    """
    CSV dosyasını okur
    
    Args:
        csv_file: CSV dosya yolu
    
    Returns:
        Dict listesi
    """
    data_list = []
    
    if not os.path.exists(csv_file):
        return data_list
    
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Davacilar'ı liste'ye çevir
            if row.get("davacilar"):
                row["davacilar"] = [d.strip() for d in row["davacilar"].split(",") if d.strip()]
            else:
                row["davacilar"] = []
            data_list.append(row)
    
    return data_list

