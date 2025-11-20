"""
İflas Pipeline Kullanım Örnekleri
"""
from iflas_pipeline import process_iflas_ilan, save_to_csv, save_batch_to_csv
import json


def example_file_path():
    """Dosya yolu ile örnek"""
    image_path = "test_image.jpg"
    
    try:
        result = process_iflas_ilan(image_path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Hata: {e}")


def example_base64():
    """Base64 string ile örnek"""
    import base64
    
    # Görseli base64'e çevir
    with open("test_image.jpg", "rb") as f:
        image_data = f.read()
        image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    try:
        result = process_iflas_ilan(image_base64)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Hata: {e}")


def example_bytes():
    """Bytes ile örnek"""
    with open("test_image.jpg", "rb") as f:
        image_data = f.read()
    
    try:
        result = process_iflas_ilan(image_data)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except Exception as e:
        print(f"Hata: {e}")


def example_csv_single():
    """Tek görseli CSV'ye kaydetme örneği"""
    image_path = "test_image.jpg"
    
    try:
        result = process_iflas_ilan(image_path)
        
        # CSV'ye kaydet
        save_to_csv(result, "output.csv", append=False)
        print("CSV dosyasına kaydedildi: output.csv")
    except Exception as e:
        print(f"Hata: {e}")


def example_csv_batch():
    """Birden fazla görseli CSV'ye kaydetme örneği"""
    image_paths = ["test_image1.jpg", "test_image2.jpg", "test_image3.jpg"]
    results = []
    
    for image_path in image_paths:
        try:
            result = process_iflas_ilan(image_path)
            results.append(result)
            print(f"İşlendi: {image_path}")
        except Exception as e:
            print(f"Hata ({image_path}): {e}")
    
    # Tüm sonuçları CSV'ye kaydet
    if results:
        save_batch_to_csv(results, "batch_output.csv")
        print(f"{len(results)} görsel CSV dosyasına kaydedildi: batch_output.csv")


def example_csv_append():
    """CSV dosyasına ekleme örneği"""
    image_path = "test_image.jpg"
    
    try:
        result = process_iflas_ilan(image_path)
        
        # CSV'ye ekle (mevcut dosyaya)
        save_to_csv(result, "output.csv", append=True)
        print("CSV dosyasına eklendi: output.csv")
    except Exception as e:
        print(f"Hata: {e}")


if __name__ == "__main__":
    # Örnek kullanım
    print("=== Dosya yolu ile ===")
    example_file_path()
    
    print("\n=== CSV'ye kaydetme (tek) ===")
    example_csv_single()
    
    print("\n=== CSV'ye kaydetme (batch) ===")
    example_csv_batch()
    
    print("\n=== CSV'ye ekleme ===")
    example_csv_append()

